package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditWriteService;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;

import java.util.List;
import java.util.Map;

class ProductGalleryTransactionHttpTests extends CatalogHttpSupport {
    @MockitoSpyBean AuditWriteService auditWriter;

    @Test
    void patchAndGalleryReplacementRollBackTogetherWhenAuditFails() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        long id = createCatalog(writer).productId();
        var initial =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + id,
                        writer.token(),
                        Map.of(
                                "images",
                                List.of(
                                        Map.of(
                                                "image_url",
                                                "https://cdn.test/original-cover.jpg",
                                                "sort_order",
                                                0),
                                        Map.of(
                                                "image_url",
                                                "https://cdn.test/original-second.jpg",
                                                "sort_order",
                                                1))));
        assertEquals(200, initial.status(), initial.body());
        String name = db.queryForObject("SELECT name FROM products WHERE id=?", String.class, id);
        var before =
                db.queryForList(
                        "SELECT id,image_url,sort_order,is_primary FROM product_images WHERE"
                            + " product_id=? ORDER BY sort_order",
                        id);
        assertEquals(2, before.size());
        AuditWriteService target = AopTestUtils.getUltimateTargetObject(auditWriter);
        try {
            doThrow(new IllegalStateException("Injected gallery audit failure"))
                    .when(target)
                    .record(argThat(event -> event.action() == AuditAction.PRODUCT_UPDATE));
            var failed =
                    call(
                            "PATCH",
                            "/api/v1/admin/products/" + id,
                            writer.token(),
                            Map.of(
                                    "name",
                                    "Changed with gallery",
                                    "images",
                                    List.of(
                                            Map.of(
                                                    "image_url",
                                                    "https://cdn.test/replacement.jpg",
                                                    "sort_order",
                                                    0))));
            assertEquals(500, failed.status(), failed.body());
            assertEquals(
                    name,
                    db.queryForObject("SELECT name FROM products WHERE id=?", String.class, id));
            assertEquals(
                    before,
                    db.queryForList(
                            "SELECT id,image_url,sort_order,is_primary FROM product_images WHERE"
                                + " product_id=? ORDER BY sort_order",
                            id));
        } finally {
            reset(target);
        }
        var cleared =
                call(
                        "PATCH",
                        "/api/v1/admin/products/" + id,
                        writer.token(),
                        Map.of("name", "Changed with gallery", "images", List.of()));
        assertEquals(200, cleared.status(), cleared.body());
        assertEquals(
                "Changed with gallery",
                db.queryForObject("SELECT name FROM products WHERE id=?", String.class, id));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_images WHERE product_id=?",
                        Integer.class,
                        id));
    }
}
