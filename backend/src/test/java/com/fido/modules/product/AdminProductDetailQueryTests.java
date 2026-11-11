package com.fido.modules.product;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class AdminProductDetailQueryTests extends CatalogHttpSupport {
    @Autowired EntityManagerFactory entityManagerFactory;
    private final List<Long> attributes = new ArrayList<>();

    @AfterEach
    void cleanMetadata() {
        for (long id : products) db.update("DELETE FROM product_attribute_values WHERE product_id=?", id);
        for (long id : attributes) {
            db.update("DELETE FROM attribute_options WHERE attribute_id=?", id);
            db.update("DELETE FROM attributes WHERE id=?", id);
        }
    }

    @Test
    void detailLoadsCompleteRelationsWithoutQueryGrowthFromChildrenOrAttributes() throws Exception {
        Employee writer = new Employee(0, root());
        long parent = createCatalog(writer).productId();
        enrich(parent, 2);
        long first = child(writer, parent);
        enrich(first, 2);
        var stats = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        boolean enabled = stats.isStatisticsEnabled();
        stats.setStatisticsEnabled(true);
        try {
            long before = stats.getPrepareStatementCount();
            Result small = call("GET", "/api/v1/admin/products/" + parent, writer.token(), null);
            assertEquals(200, small.status(), small.body());
            long smallCount = stats.getPrepareStatementCount() - before;
            assertEquals(1, small.data().get("data").get("children").size());

            List<Long> children = new ArrayList<>(List.of(first));
            for (int i = 0; i < 5; i++) {
                long child = child(writer, parent);
                enrich(child, 4);
                children.add(child);
            }
            long deleted = child(writer, parent);
            db.update("UPDATE products SET deleted_at=CURRENT_TIMESTAMP(6) WHERE id=?", deleted);
            before = stats.getPrepareStatementCount();
            Result large = call("GET", "/api/v1/admin/products/" + parent, writer.token(), null);
            assertEquals(200, large.status(), large.body());
            long largeCount = stats.getPrepareStatementCount() - before;
            assertEquals(smallCount, largeCount,
                    "Query count must not grow with children, distinct references, or Attribute Options");
            var data = large.data().get("data");
            assertTrue(data.get("parent_product").isNull());
            assertEquals(2, data.get("images").size());
            assertEquals(2, data.get("attribute_values").size());
            assertEquals(children.size(), data.get("children").size());
            for (int index = 0; index < children.size(); index++) {
                var detail = data.get("children").get(index);
                assertEquals(children.get(index).longValue(), detail.get("product_id").asLong());
                assertEquals(children.get(index).longValue(), data.get("child_product_ids").get(index).asLong());
                assertFalse(detail.get("category").isNull());
                assertFalse(detail.get("brand").isNull());
                assertEquals(2, detail.get("images").size());
                assertEquals(0, detail.get("images").get(0).get("sort_order").asInt());
                assertEquals(1, detail.get("images").get(1).get("sort_order").asInt());
                assertEquals(index == 0 ? 2 : 4, detail.get("attribute_values").size());
            }
            Result childDetail = call("GET", "/api/v1/admin/products/" + first, writer.token(), null);
            assertEquals(200, childDetail.status(), childDetail.body());
            var parentDetail = childDetail.data().get("data").get("parent_product");
            assertEquals(parent, parentDetail.get("product_id").asLong());
            assertEquals(2, parentDetail.get("images").size());
            assertEquals(2, parentDetail.get("attribute_values").size());
            assertEquals(0, childDetail.data().get("data").get("children").size());
            System.out.printf("Admin detail query count: 1 child/4 values=%d; 6 children/24 values=%d%n", smallCount, largeCount);
        } finally {
            stats.setStatisticsEnabled(enabled);
        }
    }

    @Test
    void standaloneProductPreservesNullReferencesAndEmptyCollections() throws Exception {
        String token = root();
        Result created = call("POST", "/api/v1/admin/products", token,
                Map.of("sku", "SOLO-" + UUID.randomUUID(), "selling_price", 10000));
        assertEquals(201, created.status(), created.body());
        long id = created.data().get("data").get("product_id").asLong();
        products.add(id);
        Result detail = call("GET", "/api/v1/admin/products/" + id, token, null);
        assertEquals(200, detail.status(), detail.body());
        var data = detail.data().get("data");
        for (String field : List.of("category", "brand", "parent_product", "category_id", "brand_id")) {
            assertTrue(data.get(field).isNull(), field);
        }
        for (String field : List.of("images", "attribute_values", "children", "child_product_ids")) {
            assertEquals(0, data.get(field).size(), field);
        }
    }

    private long child(Employee writer, long parent) throws Exception {
        long id = createCatalog(writer).productId();
        db.update("UPDATE products SET parent_product_id=? WHERE id=?", parent, id);
        return id;
    }

    private void enrich(long product, int count) {
        for (int i = 0; i < 2; i++) db.update(
                "INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (?,?,?,?)",
                product, "https://cdn.test/" + product + "/" + i + ".png", i == 0, i);
        for (int i = 0; i < count; i++) {
            String code = "QUERY-" + UUID.randomUUID();
            db.update("INSERT INTO attributes(code,name,sort_order) VALUES (?,?,?)", code, code, i);
            long attribute = db.queryForObject("SELECT id FROM attributes WHERE code=?", Long.class, code);
            attributes.add(attribute);
            db.update("INSERT INTO attribute_options(attribute_id,value,label) VALUES (?,'VALUE','Label')", attribute);
            long option = db.queryForObject("SELECT id FROM attribute_options WHERE attribute_id=?", Long.class, attribute);
            db.update("INSERT INTO product_attribute_values(product_id,attribute_id,option_id) VALUES (?,?,?)", product, attribute, option);
        }
    }
}
