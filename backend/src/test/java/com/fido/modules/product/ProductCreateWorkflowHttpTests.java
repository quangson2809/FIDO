package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import java.util.Map;
import java.util.UUID;

class ProductCreateWorkflowHttpTests extends CatalogHttpSupport {
    @Test
    void rootPickerFiltersBeforePaginationAndExcludesDeletedProducts() throws Exception {
        Employee writer = writer();
        String term = "PICK-" + UUID.randomUUID();
        long first = create(writer, Map.of("sku", term + "-A", "selling_price", 0));
        long second = create(writer, Map.of("sku", term + "-B", "selling_price", 100, "status", "INACTIVE"));
        create(writer, Map.of("sku", term + "-CHILD", "selling_price", 100, "parent_product_id", first));
        long deleted = create(writer, Map.of("sku", term + "-DELETED", "selling_price", 100));
        assertEquals(204, call("DELETE", "/api/v1/admin/products/" + deleted, writer.token(), null).status());
        String path = "/api/v1/admin/products?q=" + term + "&root_only=true&page_size=1";
        var pageOne = call("GET", path, writer.token(), null);
        var pageTwo = call("GET", path + "&page=2", writer.token(), null);
        assertEquals(200, pageOne.status(), pageOne.body());
        assertEquals(200, pageTwo.status(), pageTwo.body());
        assertEquals(2, pageOne.data().get("meta").get("total").asLong());
        assertEquals(2, pageOne.data().get("meta").get("total_pages").asInt());
        assertEquals(first, pageOne.data().get("data").get(0).get("product_id").asLong());
        assertEquals(second, pageTwo.data().get("data").get(0).get("product_id").asLong());
        assertTrue(pageTwo.data().get("data").get(0).get("parent_product_id").isNull());
        assertEquals(3, call("GET", "/api/v1/admin/products?q=" + term, writer.token(), null)
                .data().get("meta").get("total").asLong(), "normal lists retain children");
        assertEquals(401, call("GET", path, null, null).status());
        Employee noRead = employee(customRole(ensurePermission("CATALOG_WRITE")));
        assertEquals(403, call("GET", path, noRead.token(), null).status());
    }

    @Test
    void createErrorsIdentifyFieldsAndRejectedRequestsDoNotPersistProducts() throws Exception {
        Employee writer = writer();
        var fixture = createCatalog(writer);
        String sku = "CREATE-" + UUID.randomUUID();
        long product = create(writer, Map.of("sku", sku, "selling_price", 0));
        assertEquals("DRAFT", db.queryForObject("SELECT status FROM products WHERE id=?", String.class, product));
        assertNull(db.queryForObject("SELECT category_id FROM products WHERE id=?", Long.class, product));
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM product_images WHERE product_id=?", Integer.class, product));
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM inventories WHERE product_id=?", Integer.class, product));
        assertCode(writer, Map.of("sku", sku, "selling_price", 100), 409, "PRODUCT_SKU_ALREADY_EXISTS");
        db.update("UPDATE categories SET status='INACTIVE' WHERE id=?", fixture.categoryId());
        db.update("UPDATE brands SET status='INACTIVE' WHERE id=?", fixture.brandId());
        String rejected = "REJECT-" + UUID.randomUUID();
        assertCode(writer, Map.of("sku", rejected, "selling_price", 100, "category_id", fixture.categoryId()), 409, "PRODUCT_CATEGORY_INACTIVE");
        assertCode(writer, Map.of("sku", rejected, "selling_price", 100, "brand_id", fixture.brandId()), 409, "PRODUCT_BRAND_INACTIVE");
        assertCode(writer, Map.of("sku", rejected, "selling_price", 100, "category_id", Long.MAX_VALUE), 404, "PRODUCT_CATEGORY_NOT_FOUND");
        assertCode(writer, Map.of("sku", rejected, "selling_price", 100, "brand_id", Long.MAX_VALUE), 404, "PRODUCT_BRAND_NOT_FOUND");
        assertCode(writer, Map.of("sku", rejected, "selling_price", 100, "parent_product_id", Long.MAX_VALUE), 404, "PRODUCT_PARENT_NOT_FOUND");
        long child = create(writer, Map.of("sku", "CHILD-" + UUID.randomUUID(), "selling_price", 100, "parent_product_id", product));
        assertCode(writer, Map.of("sku", rejected, "selling_price", 100, "parent_product_id", child), 409, "PRODUCT_PARENT_INVALID");
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM products WHERE sku=?", Integer.class, rejected));
        assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM products WHERE sku=?", Integer.class, sku));
        var metadata = call("GET", "/api/v1/admin/catalog/meta", writer.token(), null);
        assertEquals(200, metadata.status(), metadata.body());
        var limits = metadata.data().get("data").get("image_upload");
        assertEquals(32L * 1024 * 1024, limits.get("max_file_bytes").asLong());
        assertEquals(64L * 1024 * 1024, limits.get("max_request_bytes").asLong());
        assertEquals(10, limits.get("max_files").asInt());
        assertEquals(3, limits.get("content_types").size());
    }

    private Employee writer() throws Exception {
        long role = customRole(ensurePermission("CATALOG_WRITE"));
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", role, ensurePermission("CATALOG_READ"));
        return employee(role);
    }
    private long create(Employee writer, Map<String, Object> body) throws Exception {
        var response = call("POST", "/api/v1/admin/products", writer.token(), body);
        assertEquals(201, response.status(), response.body());
        long id = response.data().get("data").get("product_id").asLong();
        products.add(id);
        return id;
    }
    private void assertCode(Employee writer, Map<String, Object> body, int status, String code) throws Exception {
        var response = call("POST", "/api/v1/admin/products", writer.token(), body);
        assertEquals(status, response.status(), response.body());
        assertEquals(code, response.data().get("code").asText(), response.body());
    }
}
