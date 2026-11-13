package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import com.fido.modules.product.service.ProductAdminService;
import com.fido.modules.product.dto.request.ProductPatchRequest;

class DynamicCatalogHttpTests extends CatalogHttpSupport {
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired ProductAdminService admin;
    private final List<Long> attributes = new ArrayList<>();
    private final List<Long> options = new ArrayList<>();
    private final Map<Long, String> codes = new HashMap<>();

    @AfterEach void cleanAttributes() {
        for (Long id : products) db.update("DELETE FROM product_attribute_values WHERE product_id=?", id);
        for (Long id : options) db.update("DELETE FROM attribute_options WHERE id=?", id);
        for (Long id : attributes) db.update("DELETE FROM attributes WHERE id=?", id);
    }

    private Employee writer() throws Exception {
        long role = customRole(ensurePermission("CATALOG_WRITE"));
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", role, ensurePermission("CATALOG_READ"));
        return employee(role);
    }
    private long attribute(Employee writer, String name) throws Exception {
        String code = ("COLOR".equals(name) || "SIZE".equals(name)) ? name
                : name + "_" + UUID.randomUUID().toString().replace("-", "");
        var r = call("POST", "/api/v1/admin/catalog/attributes", writer.token(),
                Map.of("code", code, "name", name, "is_required", false, "is_variant_defining", true));
        assertEquals(201, r.status(), r.body());
        long id = r.data().get("data").get("id").asLong(); attributes.add(id); codes.put(id, code); return id;
    }
    private long option(Employee writer, long attribute, String value) throws Exception {
        var r = call("POST", "/api/v1/admin/catalog/attributes/" + attribute + "/options", writer.token(),
                Map.of("value", value, "label", value));
        assertEquals(201, r.status(), r.body());
        long id = r.data().get("data").get("id").asLong(); options.add(id); return id;
    }
    private Result create(Employee writer, Long parent, long category, String status, List<Long> values) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("sku", "DYNAMIC-" + UUID.randomUUID()); body.put("name", "Dynamic family");
        body.put("category_id", category); body.put("selling_price", 150000); body.put("status", status);
        body.put("attribute_value_ids", values); if (parent != null) body.put("parent_product_id", parent);
        Result r = call("POST", "/api/v1/admin/products", writer.token(), body);
        if (r.status() == 201) products.add(r.data().get("data").get("product_id").asLong());
        return r;
    }
    private long created(Result r) { assertEquals(201, r.status(), r.body()); return r.data().get("data").get("product_id").asLong(); }
    private String filter(long attribute, String value) { return "&attribute_filters%5B" + codes.get(attribute) + "%5D=" + value; }
    private long total(String path) throws Exception {
        Result r = call("GET", path, null, null); assertEquals(200, r.status(), r.body());
        for (var row : r.data().get("data")) {
            assertTrue(row.get("parent_product_id").isNull()); assertFalse(row.has("family"));
        }
        return r.data().get("meta").get("total").asLong();
    }

    @Test void summaryCountsRootsAndMatchesAllOptionsOnOnePublicSku() throws Exception {
        Employee w = writer(); var f = createCatalog(w);
        long color = attribute(w, "COLOR"), size = attribute(w, "SIZE");
        long black = option(w, color, "BLACK"), white = option(w, color, "WHITE"), red = option(w, color, "RED");
        long m = option(w, size, "M"), l = option(w, size, "L");
        assertEquals(200, call("PATCH", "/api/v1/admin/products/" + f.productId(), w.token(),
                Map.of("name", "Dynamic family", "attribute_value_ids", List.of(black, m))).status());
        long blackL = created(create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(black, l)));
        long whiteM = created(create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(white, m)));
        created(create(w, f.productId(), f.categoryId(), "INACTIVE", List.of(red, l)));
        created(create(w, f.productId(), f.categoryId(), "DRAFT", List.of(red, m)));
        long deleted = created(create(w, f.productId(), f.categoryId(), "DRAFT", List.of(red, m)));
        db.update("UPDATE products SET status='ACTIVE',deleted_at=CURRENT_TIMESTAMP WHERE id=?", deleted);
        String list = "/api/v1/catalog/products?category_id=" + f.categoryId();
        assertEquals(1, total(list)); assertEquals(1, total(list + "&q=Dynamic"));
        assertEquals(1, total(list + filter(color, "WHITE") + filter(size, "M")));
        assertEquals(0, total(list + filter(color, "WHITE") + filter(size, "L")));
        assertEquals(0, total(list + filter(color, "RED")));
        assertEquals(1, total(list + filter(color, "BLACK") + filter(size, "M")));
        assertEquals(0, total(list + "&min_price=110000"), "price remains parent-owned");
        long second = created(create(w, null, f.categoryId(), "ACTIVE", List.of()));
        assertEquals(2, total(list + "&page_size=1"));
        var page = call("GET", list + "&page=2&page_size=1", null, null);
        assertEquals(2, page.data().get("meta").get("total_pages").asInt());
        assertEquals(1, page.data().get("data").size());
        var admin = call("GET", "/api/v1/admin/products?parent_product_id=" + f.productId(), w.token(), null);
        // Public queries do not change the admin list's child visibility.
        assertEquals(200, admin.status(), admin.body());
        assertTrue(admin.data().get("data").size() >= 2);
        for (long id : List.of(f.productId(), blackL, whiteM)) {
            var detail = call("GET", "/api/v1/catalog/products/" + id, null, null);
            assertEquals(id, detail.data().get("data").get("product_id").asLong());
            assertEquals(3, detail.data().get("data").get("family").get("members").size());
            for (var value : detail.data().get("data").get("attribute_values")) {
                assertTrue(value.get("is_variant_defining").asBoolean()); assertTrue(value.has("sort_order"));
            }
        }
        assertTrue(second > 0);
    }

    @Test void duplicateIncompleteActivationAndReparentingRollBack() throws Exception {
        Employee w = writer(); var f = createCatalog(w);
        long color = attribute(w, "COLOR"), size = attribute(w, "SIZE");
        long black = option(w, color, "BLACK"), white = option(w, color, "WHITE");
        long small = option(w, size, "28"), large = option(w, size, "32");
        assertEquals(200, call("PATCH", "/api/v1/admin/products/" + f.productId(), w.token(),
                Map.of("attribute_value_ids", List.of(black, small))).status());
        long child = created(create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(white, large)));
        assertEquals(409, create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(black, small)).status());
        assertEquals(409, create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(white)).status());
        long draft = created(create(w, f.productId(), f.categoryId(), "DRAFT", List.of(black, small)));
        assertEquals(409, call("PATCH", "/api/v1/admin/products/" + draft, w.token(), Map.of("status", "ACTIVE")).status());
        assertEquals("DRAFT", db.queryForObject("SELECT status FROM products WHERE id=?", String.class, draft));
        assertEquals(409, call("PATCH", "/api/v1/admin/products/" + child, w.token(),
                Map.of("attribute_value_ids", List.of(black, small))).status());
        assertEquals(white, db.queryForObject("SELECT option_id FROM product_attribute_values WHERE product_id=? AND attribute_id=?", Long.class, child, color));
        long separate = created(create(w, null, f.categoryId(), "ACTIVE", List.of(white, large)));
        assertEquals(409, call("PATCH", "/api/v1/admin/products/" + separate, w.token(), Map.of("parent_product_id", f.productId())).status());
        assertNull(db.queryForObject("SELECT parent_product_id FROM products WHERE id=?", Long.class, separate));
    }

    @Test void colorSizeTuplesRemainUniqueRegardlessOfDescriptiveFlags() throws Exception {
        Employee w = writer(); var f = createCatalog(w);
        long color = attribute(w, "COLOR"), size = attribute(w, "SIZE");
        long black = option(w, color, "BLACK"), m = option(w, size, "39"), l = option(w, size, "41");
        assertEquals(200, call("PATCH", "/api/v1/admin/products/" + f.productId(), w.token(), Map.of("attribute_value_ids", List.of(black, m))).status());
        created(create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(black, l)));
        var changed = call("PATCH", "/api/v1/admin/catalog/attributes/" + size, w.token(), Map.of("is_variant_defining", false));
        assertEquals(200, changed.status(), changed.body());
        assertEquals(409, create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(black, l)).status());
        assertEquals(false, db.queryForObject("SELECT is_variant_defining FROM attributes WHERE id=?", Boolean.class, size));
    }

    @Test void parentMustCarryItsOwnColorOrSizeCombination() throws Exception {
        Employee w = writer(); var f = createCatalog(w); long attr = attribute(w, "COLOR");
        long black = option(w, attr, "BLACK");
        var rejected = create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(black));
        assertEquals(409, rejected.status(), rejected.body());
        assertEquals(409, create(w, f.productId(), f.categoryId(), "ACTIVE", List.of()).status());
        assertEquals(200, call("PATCH", "/api/v1/admin/products/" + f.productId(), w.token(),
                Map.of("attribute_value_ids", List.of(black))).status());
        long white = option(w, attr, "WHITE");
        long child = created(create(w, f.productId(), f.categoryId(), "ACTIVE", List.of(white)));
        var detail = call("GET", "/api/v1/catalog/products/" + child, null, null);
        var members = detail.data().get("data").get("family").get("members");
        assertEquals(2, members.size());
        assertEquals(f.productId(), members.get(0).get("product_id").asLong());
        assertEquals(black, members.get(0).get("attribute_values").get(0).get("attribute_value_id").asLong());
    }

    private <T> T afterConcurrentCommit(long rootId, Runnable committedChange, Employee writer,
            Callable<T> mutation) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var locked = new CountDownLatch(1);
        var snapshot = new CountDownLatch(1);
        try {
            var first = pool.submit(() -> new TransactionTemplate(transactionManager).execute(status -> {
                db.queryForObject("SELECT id FROM products WHERE id=? FOR UPDATE", Long.class, rootId);
                committedChange.run(); locked.countDown();
                try { assertTrue(snapshot.await(5, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new RuntimeException(e); }
                return null;
            }));
            var second = pool.submit(() -> {
                assertTrue(locked.await(5, TimeUnit.SECONDS));
                var context = SecurityContextHolder.createEmptyContext();
                var jwt = Jwt.withTokenValue("catalog-concurrency-test").header("alg", "none")
                        .subject(Long.toString(writer.id())).build();
                context.setAuthentication(new JwtAuthenticationToken(jwt,
                        List.of(new SimpleGrantedAuthority("PERMISSION_CATALOG_WRITE"))));
                SecurityContextHolder.setContext(context);
                try {
                    return new TransactionTemplate(transactionManager).execute(status -> {
                        // Establish the old REPEATABLE_READ view while the other writer is uncommitted.
                        db.queryForObject("SELECT id FROM products WHERE id=?", Long.class, rootId);
                        snapshot.countDown();
                        try { return mutation.call(); }
                        catch (RuntimeException e) { throw e; }
                        catch (Exception e) { throw new RuntimeException(e); }
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            first.get(10, TimeUnit.SECONDS);
            return second.get(10, TimeUnit.SECONDS);
        } finally { pool.shutdownNow(); }
    }

    @Test void patchUsesCurrentOptionsAfterAnotherFamilyWriterCommits() throws Exception {
        Employee w = writer(); var f = createCatalog(w);
        long attr = attribute(w, "FINISH"), a = option(w, attr, "A"), b = option(w, attr, "B");
        assertEquals(200, call("PATCH", "/api/v1/admin/products/" + f.productId(), w.token(),
                Map.of("attribute_value_ids", List.of(a))).status());
        ProductPatchRequest request = json.readValue("{\"attribute_value_ids\":[" + a + "]}", ProductPatchRequest.class);
        afterConcurrentCommit(f.productId(), () -> db.update(
                "UPDATE product_attribute_values SET option_id=? WHERE product_id=? AND attribute_id=?",
                b, f.productId(), attr), w, () -> admin.updateProduct(w.id(), f.productId(), request));
        assertEquals(a, db.queryForObject("SELECT option_id FROM product_attribute_values WHERE product_id=? AND attribute_id=?",
                Long.class, f.productId(), attr));
    }

    @Test void reparentCannotMissAChildCommittedWhileWaitingForFamilyLock() throws Exception {
        Employee w = writer(); var f = createCatalog(w);
        long target = created(create(w, null, f.categoryId(), "ACTIVE", List.of()));
        String sku = "CONCURRENT-" + UUID.randomUUID();
        ProductPatchRequest request = json.readValue("{\"parent_product_id\":" + target + "}", ProductPatchRequest.class);
        try {
            var rejected = assertThrows(ExecutionException.class, () -> afterConcurrentCommit(f.productId(),
                    () -> db.update("INSERT INTO products(parent_product_id,category_id,sku,selling_price,status) VALUES (?,?,?,?,?)",
                            f.productId(), f.categoryId(), sku, 100000, "DRAFT"),
                    w, () -> admin.updateProduct(w.id(), f.productId(), request)));
            assertInstanceOf(org.springframework.web.server.ResponseStatusException.class, rejected.getCause());
            assertEquals(409, ((org.springframework.web.server.ResponseStatusException) rejected.getCause()).getStatusCode().value());
            assertNull(db.queryForObject("SELECT parent_product_id FROM products WHERE id=?", Long.class, f.productId()));
        } finally {
            products.add(db.queryForObject("SELECT id FROM products WHERE sku=?", Long.class, sku));
        }
    }

    @Test void clearGalleryRemovesImagesCommittedWhileWaitingForProductLock() throws Exception {
        Employee w = writer(); var f = createCatalog(w);
        ProductPatchRequest request = json.readValue("{\"images\":[]}", ProductPatchRequest.class);
        afterConcurrentCommit(f.productId(), () -> db.update(
                "INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (?,?,TRUE,0)",
                f.productId(), "https://cdn.example.test/concurrent.jpg"),
                w, () -> admin.updateProduct(w.id(), f.productId(), request));
        assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM product_images WHERE product_id=?", Integer.class, f.productId()));
    }

}
