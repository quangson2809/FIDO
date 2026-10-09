package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doAnswer;

import com.fido.modules.product.service.CatalogReferenceService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

class SizeSystemConcurrencyTests extends CatalogHttpSupport {
    @MockitoSpyBean
    CatalogReferenceService references;

    @Test
    void sizeSystemUpdateAndVariantCreationCannotCommitIncompatibleSizes() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        long productId = fixture.productId();
        db.update("DELETE FROM inventories WHERE variant_id=?", fixture.variantId());
        db.update("DELETE FROM product_variants WHERE product_id=?", productId);
        var other = call("POST", "/api/v1/admin/size-systems", writer.token(),
                Map.of("code", "SZ-" + UUID.randomUUID(), "name", "Other", "size_values", List.of()));
        assertEquals(201, other.status(), other.body());
        long otherId = other.data().get("data").get("size_system_id").asLong();
        systems.add(otherId);

        var ready = new CountDownLatch(2);
        doAnswer(invocation -> {
            ready.countDown();
            assertTrue(ready.await(10, TimeUnit.SECONDS), "Both commands must acquire the product lock");
            return invocation.callRealMethod();
        }).when(references).productForUpdate(productId);

        var pool = Executors.newFixedThreadPool(2);
        try {
            var update = pool.submit(() -> call("PATCH", "/api/v1/admin/products/" + productId,
                    writer.token(), Map.of("size_system_id", otherId, "name", "Changed")));
            var create = pool.submit(() -> call("POST", "/api/v1/admin/products/" + productId + "/variants",
                    writer.token(), Map.of("variants", List.of(Map.of("size_value_id", fixture.sizeM(),
                            "color_id", fixture.colorId(), "sale_status", "ON_SALE")))));
            var updateResult = update.get(25, TimeUnit.SECONDS);
            var createResult = create.get(25, TimeUnit.SECONDS);
            assertTrue((updateResult.status() == 200 && createResult.status() == 409)
                    || (updateResult.status() == 409 && createResult.status() == 201),
                    updateResult.body() + " / " + createResult.body());
            assertEquals(0, db.queryForObject("""
                    SELECT COUNT(*) FROM product_variants v
                    JOIN products p ON p.product_id=v.product_id
                    JOIN size_values s ON s.size_value_id=v.size_value_id
                    WHERE p.product_id=? AND p.size_system_id<>s.size_system_id
                    """, Integer.class, productId));
            assertEquals(updateResult.status() == 200 ? otherId : fixture.systemId(),
                    db.queryForObject("SELECT size_system_id FROM products WHERE product_id=?", Long.class, productId));
            assertEquals(updateResult.status() == 200 ? "Changed" : fixture.createProductResponse().data().get("data").get("name").asText(),
                    db.queryForObject("SELECT name FROM products WHERE product_id=?", String.class, productId));
            assertEquals(createResult.status() == 201 ? 1 : 0, db.queryForObject("""
                    SELECT COUNT(*) FROM inventories i JOIN product_variants v ON i.variant_id=v.variant_id
                    WHERE v.product_id=?
                    """, Integer.class, productId));
        } finally {
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS));
        }
    }
}
