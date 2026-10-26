package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.UUID;

class ProductCoreHttpTests extends CatalogHttpSupport {

    @Test
    void productsOwnTheirSkuAndIntegerVndPriceAndHierarchyStopsAtOneLevel() throws Exception {
        Employee writer = catalogWriter();
        String suffix = UUID.randomUUID().toString().replace("-", "");
        Result parentResponse = createProduct(writer, "PARENT-" + suffix, "Parent " + suffix, 125000, null);
        assertEquals(201, parentResponse.status(), parentResponse.body());
        long parentId = parentResponse.data().get("data").get("product_id").asLong();
        products.add(parentId);

        Result childResponse = createProduct(writer, "CHILD-" + suffix, null, 91000, parentId);
        assertEquals(201, childResponse.status(), childResponse.body());
        long childId = childResponse.data().get("data").get("product_id").asLong();
        products.add(childId);

        Result childDetail = call("GET", "/api/v1/admin/products/" + childId, writer.token(), null);
        assertEquals(200, childDetail.status(), childDetail.body());
        var child = childDetail.data().get("data");
        assertEquals(childId, child.get("product_id").asLong());
        assertEquals(parentId, child.get("parent_product_id").asLong());
        assertEquals("CHILD-" + suffix, child.get("sku").asText());
        assertEquals(91000, child.get("selling_price").asLong());
        assertTrue(!child.has("name") || child.get("name").isNull(), "NULL child fields must not inherit parent values");

        Result parentDetail = call("GET", "/api/v1/admin/products/" + parentId, writer.token(), null);
        assertEquals(125000, parentDetail.data().get("data").get("selling_price").asLong());
        assertEquals(childId, parentDetail.data().get("data").get("child_product_ids").get(0).asLong());

        assertEquals(409, call("PATCH", "/api/v1/admin/products/" + parentId, writer.token(),
                Map.of("parent_product_id", parentId)).status(), "Self-parenting must be rejected");
        assertEquals(409, call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("parent_product_id", childId, "sku", "GRAND-" + suffix,
                        "selling_price", 40000, "status", "ACTIVE")).status(),
                "Product nesting beyond one child level must be rejected");
        assertEquals(409, call("PATCH", "/api/v1/admin/products/" + parentId, writer.token(),
                Map.of("parent_product_id", childId)).status(),
                "Re-parenting a root beneath its child must be rejected");
        assertEquals(404, call("POST", "/api/v1/admin/products/" + parentId + "/variants",
                writer.token(), Map.of("variants", List.of())).status(),
                "The legacy variant write route must no longer exist");
    }

    @Test
    void skuUniquenessAndStatusAndIntegerPriceAreValidated() throws Exception {
        Employee writer = catalogWriter();
        String sku = "UNIQUE-" + UUID.randomUUID().toString().replace("-", "");
        Result first = createProduct(writer, sku, "First", 100000, null);
        assertEquals(201, first.status(), first.body());
        products.add(first.data().get("data").get("product_id").asLong());

        Result duplicate = createProduct(writer, sku, "Duplicate", 110000, null);
        assertEquals(409, duplicate.status(), duplicate.body());

        Result invalidStatus = call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("sku", "BAD-STATUS-" + UUID.randomUUID(), "selling_price", 10000, "status", "ON_SALE"));
        assertEquals(400, invalidStatus.status(), invalidStatus.body());

        Result negativePrice = call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("sku", "NEGATIVE-" + UUID.randomUUID(), "selling_price", -1, "status", "ACTIVE"));
        assertEquals(400, negativePrice.status(), negativePrice.body());

        Result decimalPrice = call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("sku", "DECIMAL-" + UUID.randomUUID(), "selling_price", 10000.50, "status", "ACTIVE"));
        assertEquals(400, decimalPrice.status(), decimalPrice.body());

        Result second = createProduct(writer, "OTHER-" + UUID.randomUUID(), "Second", 120000, null);
        assertEquals(201, second.status(), second.body());
        long secondId = second.data().get("data").get("product_id").asLong();
        products.add(secondId);
        Result duplicatePatch = call("PATCH", "/api/v1/admin/products/" + secondId, writer.token(),
                Map.of("sku", sku));
        assertEquals(409, duplicatePatch.status(), duplicatePatch.body());
    }

    @Test
    void productIdQueriesAndCategoryBrandSlugsUseCanonicalRows() throws Exception {
        Employee writer = catalogWriter();
        CatalogFixture fixture = createCatalog(writer);
        var adminDetail = call("GET", "/api/v1/admin/products/" + fixture.productId(), writer.token(), null);
        var publicDetail = call("GET", "/api/v1/catalog/products/" + fixture.productId(), null, null);

        assertEquals(200, adminDetail.status(), adminDetail.body());
        assertEquals(200, publicDetail.status(), publicDetail.body());
        assertEquals(fixture.productId(), adminDetail.data().get("data").get("product_id").asLong());
        assertEquals(fixture.productId(), publicDetail.data().get("data").get("product_id").asLong());

        String rootToken = root();
        var category = call("POST", "/api/v1/admin/categories", rootToken,
                Map.of("name", "Category " + UUID.randomUUID()));
        assertEquals(201, category.status(), category.body());
        long categoryId = category.data().get("data").get("category_id").asLong();
        categories.add(categoryId);
        assertTrue(category.data().get("data").get("slug").asText().length() > 0);

        var childCategory = call("POST", "/api/v1/admin/categories", rootToken,
                Map.of("parent_category_id", categoryId, "name", "Child " + UUID.randomUUID()));
        assertEquals(201, childCategory.status(), childCategory.body());
        long childCategoryId = childCategory.data().get("data").get("category_id").asLong();
        categories.add(childCategoryId);
        var grandchildCategory = call("POST", "/api/v1/admin/categories", rootToken,
                Map.of("parent_category_id", childCategoryId, "name", "Grandchild " + UUID.randomUUID()));
        assertEquals(201, grandchildCategory.status(), grandchildCategory.body());
        long grandchildCategoryId = grandchildCategory.data().get("data").get("category_id").asLong();
        categories.add(grandchildCategoryId);

        var categoryCycle = call("PATCH", "/api/v1/admin/categories/" + categoryId, rootToken,
                Map.of("parent_category_id", childCategoryId));
        assertEquals(409, categoryCycle.status(), categoryCycle.body());

        var duplicateCategory = call("POST", "/api/v1/admin/categories", rootToken,
                Map.of("name", category.data().get("data").get("name").asText()));
        assertEquals(409, duplicateCategory.status(), duplicateCategory.body());
    }


    private Employee catalogWriter() throws Exception {
        long roleId = customRole(ensurePermission("CATALOG_WRITE"));
        long readPermissionId = ensurePermission("CATALOG_READ");
        db.update(
                "INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)",
                roleId,
                readPermissionId);
        return employee(roleId);
    }

    private Result createProduct(Employee writer, String sku, String name, long price, Long parentId)
            throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("sku", sku);
        body.put("selling_price", price);
        body.put("status", "ACTIVE");
        if (name != null) body.put("name", name);
        if (parentId != null) body.put("parent_product_id", parentId);
        return call("POST", "/api/v1/admin/products", writer.token(), body);
    }
}
