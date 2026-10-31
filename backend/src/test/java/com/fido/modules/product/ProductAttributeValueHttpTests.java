package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

class ProductAttributeValueHttpTests extends CatalogHttpSupport {
    private final List<Long> createdAttributes = new ArrayList<>();
    private final List<Long> createdOptions = new ArrayList<>();

    @AfterEach
    void cleanAttributeFixtures() {
        for (Long productId : products) db.update("DELETE FROM product_attribute_values WHERE product_id = ?", productId);
        for (Long optionId : createdOptions) db.update("DELETE FROM attribute_options WHERE id = ?", optionId);
        for (Long attributeId : createdAttributes) db.update("DELETE FROM attributes WHERE id = ?", attributeId);
    }

    @Test
    void persistsOptionOnlyValuesAndReturnsCompleteParentChildDetails() throws Exception {
        Employee writer = catalogWriter();
        long colorId = createAttribute(writer, "COLOR", "Color", false);
        long materialId = createAttribute(writer, "MATERIAL", "Material", false);
        long blackOptionId = createOption(writer, colorId, "BLACK", "Black");
        long cottonOptionId = createOption(writer, materialId, "COTTON", "Cotton");

        Result optionUpdate = call("PATCH",
                "/api/v1/admin/catalog/attributes/" + colorId + "/options/" + blackOptionId,
                writer.token(), Map.of("label", "Ink black", "sort_order", 1));
        assertEquals(200, optionUpdate.status(), optionUpdate.body());
        Result attributeUpdate = call("PATCH", "/api/v1/admin/catalog/attributes/" + materialId,
                writer.token(), Map.of("name", "Material type", "is_required", true, "sort_order", 2));
        assertEquals(200, attributeUpdate.status(), attributeUpdate.body());

        Result metadata = call("GET", "/api/v1/admin/catalog/meta", writer.token(), null);
        assertEquals(200, metadata.status(), metadata.body());
        var metadataData = metadata.data().get("data");
        assertTrue(!metadataData.has("attribute_types"));
        assertTrue(containsAttribute(metadataData.get("attributes"), materialId, "Material type"));
        assertTrue(containsOptionLabel(metadataData.get("attributes"), colorId, blackOptionId, "Ink black"));

        String suffix = UUID.randomUUID().toString().replace("-", "");
        long parentId = createProduct(writer, "PARENT-" + suffix, "Tee", 120000, null, "ACTIVE",
                List.of(blackOptionId, cottonOptionId));
        long childId = createProduct(writer, "CHILD-" + suffix, "Tee child", 135000, parentId, "ACTIVE",
                List.of(blackOptionId, cottonOptionId));

        Result childDetail = call("GET", "/api/v1/admin/products/" + childId, writer.token(), null);
        assertEquals(200, childDetail.status(), childDetail.body());
        var childData = childDetail.data().get("data");
        assertEquals(parentId, childData.get("parent_product_id").asLong());
        assertEquals(parentId, childData.get("parent_product").get("product_id").asLong());
        assertEquals("PARENT-" + suffix, childData.get("parent_product").get("sku").asText());
        assertEquals("COTTON", findValue(childData.get("parent_product").get("attribute_values"), materialId)
                .get("value").asText());
        assertEquals("COTTON", findValue(childData.get("attribute_values"), materialId).get("value").asText());
        assertEquals(135000, childData.get("selling_price").asLong());
        assertEquals("Ink black", findValue(childData.get("attribute_values"), colorId).get("label").asText());

        Result parentDetail = call("GET", "/api/v1/admin/products/" + parentId, writer.token(), null);
        assertEquals(200, parentDetail.status(), parentDetail.body());
        assertEquals(1, parentDetail.data().get("data").get("children").size());
        assertEquals(childId, parentDetail.data().get("data").get("child_product_ids").get(0).asLong());

        String galleryUrl = "https://cdn.example.test/product-child-gallery.jpg";
        db.update("INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (?,?,TRUE,0)",
                childId, galleryUrl);
        String secondGalleryUrl = "https://cdn.example.test/product-child-gallery-second.jpg";
        db.update("INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES (?,?,FALSE,1)",
                childId, secondGalleryUrl);
        long draftId = createProduct(writer, "CHILD-DRAFT-" + suffix,
                "Child not published", 145000, parentId, "DRAFT", List.of());
        long warehouseId = createOperationalWarehouse();
        db.update("INSERT INTO inventories(warehouse_id,product_id,quantity_on_hand) VALUES (?,?,?)",
                warehouseId, childId, 8);

        Result publicDetail = call("GET", "/api/v1/catalog/products/" + childId, null, null);
        assertEquals(200, publicDetail.status(), publicDetail.body());
        var childPublic = publicDetail.data().get("data");
        assertEquals(2, childPublic.get("attribute_values").size());
        assertEquals(2, childPublic.get("images").size());
        assertEquals(galleryUrl, childPublic.get("images").get(0).get("image_url").asText());
        assertEquals(secondGalleryUrl, childPublic.get("images").get(1).get("image_url").asText());
        assertEquals(parentId, childPublic.get("family").get("root_product_id").asLong());
        var members = childPublic.get("family").get("members");
        assertEquals(2, members.size(), "Public family excludes DRAFT siblings");
        assertEquals(parentId, members.get(0).get("product_id").asLong());
        assertEquals(0, members.get(0).get("available_quantity").asInt());
        assertEquals(false, members.get(0).get("purchasable").asBoolean(),
                "Parent cannot inherit its child's stock");
        assertEquals(childId, members.get(1).get("product_id").asLong());
        assertEquals(8, members.get(1).get("available_quantity").asInt());
        assertEquals(true, members.get(1).get("purchasable").asBoolean());
        assertEquals(0, members.get(0).get("images").size(), "Root does not inherit child gallery");
        assertEquals(galleryUrl, members.get(1).get("images").get(0).get("image_url").asText());
        assertEquals("COTTON", findValue(members.get(1).get("attribute_values"), materialId)
                .get("value").asText());

        Result rootPublic = call("GET", "/api/v1/catalog/products/" + parentId, null, null);
        assertEquals(200, rootPublic.status(), rootPublic.body());
        assertEquals(2, rootPublic.data().get("data").get("family").get("members").size());

        Result hidden = call("GET", "/api/v1/catalog/products/" + draftId, null, null);
        assertEquals(404, hidden.status(), hidden.body());
        Result rootDisabled = call("PATCH", "/api/v1/admin/products/" + parentId,
                writer.token(), Map.of("status", "INACTIVE"));
        assertEquals(200, rootDisabled.status(), rootDisabled.body());
        Result childWithHiddenRoot = call("GET", "/api/v1/catalog/products/" + childId, null, null);
        assertEquals(200, childWithHiddenRoot.status(), childWithHiddenRoot.body());
        assertEquals(1, childWithHiddenRoot.data().get("data").get("family").get("members").size(),
                "Inactive root is not disclosed to public family");
        db.update("UPDATE inventories SET quantity_on_hand=0 WHERE warehouse_id=? AND product_id=?",
                warehouseId, childId);
        Result soldOut = call("GET", "/api/v1/catalog/products/" + childId, null, null);
        assertEquals(200, soldOut.status(), soldOut.body());
        var soldOutMember = soldOut.data().get("data").get("family").get("members").get(0);
        assertEquals(0, soldOutMember.get("available_quantity").asInt());
        assertEquals(false, soldOutMember.get("purchasable").asBoolean());
        assertEquals(childId, childWithHiddenRoot.data().get("data").get("family")
                .get("members").get(0).get("product_id").asLong());
    }

    @Test
    void patchReplacesOptionIdsAndOmittedFieldRetainsValues() throws Exception {
        Employee writer = catalogWriter();
        long materialId = createAttribute(writer, "PATCH_MATERIAL", "Patch material", false);
        long cottonId = createOption(writer, materialId, "COTTON", "Cotton");
        long woolId = createOption(writer, materialId, "WOOL", "Wool");
        long productId = createProduct(writer, "PATCH-" + UUID.randomUUID().toString().replace("-", ""),
                "Patchable product", 50000, null, "DRAFT", List.of(cottonId));

        Result replaced = call("PATCH", "/api/v1/admin/products/" + productId, writer.token(),
                Map.of("attribute_value_ids", List.of(woolId)));
        assertEquals(200, replaced.status(), replaced.body());
        assertEquals(woolId, findValue(replaced.data().get("data").get("attribute_values"), materialId)
                .get("attribute_value_id").asLong());

        Result omitted = call("PATCH", "/api/v1/admin/products/" + productId, writer.token(),
                Map.of("status", "INACTIVE"));
        assertEquals(200, omitted.status(), omitted.body());
        assertEquals(woolId, findValue(omitted.data().get("data").get("attribute_values"), materialId)
                .get("attribute_value_id").asLong());

        Result cleared = call("PATCH", "/api/v1/admin/products/" + productId, writer.token(),
                Map.of("attribute_value_ids", List.of()));
        assertEquals(200, cleared.status(), cleared.body());
        assertEquals(0, cleared.data().get("data").get("attribute_values").size());
        assertEquals(0, db.queryForObject(
                "SELECT COUNT(*) FROM product_attribute_values WHERE product_id = ?", Integer.class, productId));
    }

    @Test
    void rejectsUnknownOptionDuplicateAttributeAndMissingRequiredOption() throws Exception {
        Employee writer = catalogWriter();
        long colorId = createAttribute(writer, "COLOR_REQUIRED", "Color required", true);
        long blackId = createOption(writer, colorId, "BLACK", "Black");
        long whiteId = createOption(writer, colorId, "WHITE", "White");

        String missingSku = "MISSING-" + UUID.randomUUID().toString().replace("-", "");
        Result missing = call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("sku", missingSku, "selling_price", 10000, "status", "ACTIVE"));
        assertEquals(400, missing.status(), missing.body());

        Result unknown = createProductResult(writer,
                "UNKNOWN-" + UUID.randomUUID().toString().replace("-", ""), "DRAFT", List.of(99999999L));
        assertEquals(400, unknown.status(), unknown.body());

        Result duplicate = createProductResult(writer,
                "DUPLICATE-" + UUID.randomUUID().toString().replace("-", ""), "DRAFT", List.of(blackId, whiteId));
        assertEquals(400, duplicate.status(), duplicate.body());
    }

    @Test
    void rejectsCreatingOrEnablingRequiredAttributeWhileActiveProductsLackIt() throws Exception {
        Employee writer = catalogWriter();
        String suffix = UUID.randomUUID().toString().replace("-", "");
        createProduct(writer, "REQUIRED-GUARD-" + suffix, "Active product", 10000,
                null, "ACTIVE", List.of());

        String requiredCode = "REQUIRED_NEW_" + suffix;
        Result rejectedCreate = call("POST", "/api/v1/admin/catalog/attributes", writer.token(),
                Map.of("code", requiredCode, "name", "New required attribute",
                        "is_required", true, "is_variant_defining", false, "sort_order", 0));
        assertEquals(409, rejectedCreate.status(), rejectedCreate.body());
        assertEquals(0, db.queryForObject(
                "SELECT COUNT(*) FROM attributes WHERE code = ?", Integer.class, requiredCode));

        long optionalId = createAttribute(writer, "OPTIONAL_GUARD", "Optional attribute", false);
        Result rejectedPatch = call("PATCH", "/api/v1/admin/catalog/attributes/" + optionalId,
                writer.token(), Map.of("is_required", true));
        assertEquals(409, rejectedPatch.status(), rejectedPatch.body());
        assertEquals(0, db.queryForObject(
                "SELECT is_required FROM attributes WHERE id = ?", Integer.class, optionalId));
    }

    @Test
    void publicListingSupportsOptionEqualityAndRejectsInvalidAttributeFilters() throws Exception {
        Employee writer = catalogWriter();
        long color = createAttribute(writer, "FILTER_COLOR", "Filter color", false);
        long material = createAttribute(writer, "FILTER_MATERIAL", "Filter material", false);
        long black = createOption(writer, color, "BLACK", "Black");
        long white = createOption(writer, color, "WHITE", "White");
        long cotton = createOption(writer, material, "COTTON", "Cotton");
        long linen = createOption(writer, material, "LINEN", "Linen");
        String suffix = UUID.randomUUID().toString().replace("-", "");
        long target = createProduct(writer, "FILTER-A-" + suffix, "Black cotton", 10000,
                null, "ACTIVE", List.of(black, cotton));
        createProduct(writer, "FILTER-B-" + suffix, "Black linen", 11000,
                null, "ACTIVE", List.of(black, linen));
        createProduct(writer, "FILTER-C-" + suffix, "White cotton", 12000,
                null, "ACTIVE", List.of(white, cotton));
        createProduct(writer, "FILTER-D-" + suffix, "Draft black cotton", 13000,
                null, "DRAFT", List.of(black, cotton));

        String colorCode = db.queryForObject("SELECT code FROM attributes WHERE id=?", String.class, color);
        String materialCode = db.queryForObject("SELECT code FROM attributes WHERE id=?", String.class, material);
        String colorQuery = "attribute_filters%5B" + colorCode + "%5D";
        String materialQuery = "attribute_filters%5B" + materialCode + "%5D";
        String base = "/api/v1/catalog/products?";

        Result blackList = call("GET", base + colorQuery + "=BLACK", null, null);
        assertEquals(200, blackList.status(), blackList.body());
        assertEquals(2, blackList.data().get("meta").get("total").asInt());

        Result exact = call("GET", base + colorQuery + "=BLACK&" + materialQuery + "=COTTON", null, null);
        assertEquals(200, exact.status(), exact.body());
        assertEquals(1, exact.data().get("meta").get("total").asInt());
        assertEquals(target, exact.data().get("data").get(0).get("product_id").asLong());

        assertEquals(400, call("GET", base + colorQuery + "=COTTON", null, null).status(),
                "Option value must belong to the requested Attribute");
        assertEquals(400, call("GET", base + "attribute_filters%5BUNKNOWN%5D=BLACK", null, null).status());
        assertEquals(400, call("GET", base + colorQuery + "=BLACK&" + colorQuery + "=WHITE", null, null).status());
        assertEquals(400, call("GET", base + "attribute_min%5B" + colorCode + "%5D=1", null, null).status());
        assertEquals(400, call("GET", base + "attribute_filters%5B" + colorCode + "=BLACK", null, null).status());
    }

    private Employee catalogWriter() throws Exception {
        long roleId = customRole(ensurePermission("CATALOG_WRITE"));
        long readPermissionId = ensurePermission("CATALOG_READ");
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, readPermissionId);
        return employee(roleId);
    }

    private long createAttribute(Employee writer, String prefix, String name, boolean required) throws Exception {
        String code = prefix + "_" + UUID.randomUUID().toString().replace("-", "");
        Result result = call("POST", "/api/v1/admin/catalog/attributes", writer.token(),
                Map.of("code", code, "name", name, "is_required", required,
                        "is_variant_defining", false, "sort_order", 0));
        assertEquals(201, result.status(), result.body());
        long id = result.data().get("data").get("id").asLong(); createdAttributes.add(id); return id;
    }

    private long createOption(Employee writer, long attributeId, String value, String label) throws Exception {
        Result result = call("POST", "/api/v1/admin/catalog/attributes/" + attributeId + "/options",
                writer.token(), Map.of("value", value, "label", label, "sort_order", 0));
        assertEquals(201, result.status(), result.body());
        long id = result.data().get("data").get("id").asLong(); createdOptions.add(id); return id;
    }

    private long createProduct(Employee writer, String sku, String name, long price, Long parentId,
            String status, List<Long> optionIds) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("sku", sku); body.put("name", name); body.put("selling_price", price);
        body.put("status", status); body.put("attribute_value_ids", optionIds);
        if (parentId != null) body.put("parent_product_id", parentId);
        Result result = call("POST", "/api/v1/admin/products", writer.token(), body);
        assertEquals(201, result.status(), result.body());
        long id = result.data().get("data").get("product_id").asLong(); products.add(id); return id;
    }

    private Result createProductResult(Employee writer, String sku, String status, List<Long> ids) throws Exception {
        return call("POST", "/api/v1/admin/products", writer.token(),
                Map.of("sku", sku, "selling_price", 10000, "status", status, "attribute_value_ids", ids));
    }

    private static boolean containsAttribute(tools.jackson.databind.JsonNode values, long id, String name) {
        for (var value : values) if (value.get("id").asLong() == id && name.equals(value.get("name").asText())) return true;
        return false;
    }
    private static boolean containsOptionLabel(tools.jackson.databind.JsonNode values, long attributeId,
            long optionId, String label) {
        for (var attribute : values) {
            if (attribute.get("id").asLong() != attributeId) continue;
            for (var option : attribute.get("options")) {
                if (option.get("id").asLong() == optionId && label.equals(option.get("label").asText())) return true;
            }
        }
        return false;
    }
    private static tools.jackson.databind.JsonNode findValue(tools.jackson.databind.JsonNode values, long id) {
        for (var value : values) if (value.get("attribute_id").asLong() == id) return value;
        throw new AssertionError("Product Attribute value not found: " + id);
    }
}
