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
        for (Long productId : products) {
            db.update("DELETE FROM product_attribute_values WHERE product_id = ?", productId);
        }
        for (Long optionId : createdOptions) {
            db.update("DELETE FROM attribute_options WHERE id = ?", optionId);
        }
        for (Long attributeId : createdAttributes) {
            db.update("DELETE FROM attributes WHERE id = ?", attributeId);
        }
    }

    @Test
    void persistsTypedValuesAndReturnsCompleteParentChildDetails() throws Exception {
        Employee writer = catalogWriter();

        long materialId = createAttribute(writer, "TEXT", "MATERIAL", "Material", true);
        long colorId = createAttribute(writer, "OPTION", "COLOR", "Color", false);

        long blackOptionId = createOption(writer, colorId, "BLACK", "Black");
        Result optionUpdate = call(
                "PATCH",
                "/api/v1/admin/catalog/attributes/" + colorId + "/options/" + blackOptionId,
                writer.token(),
                Map.of("label", "Ink black", "sort_order", 1));
        assertEquals(200, optionUpdate.status(), optionUpdate.body());

        Result attributeUpdate = call(
                "PATCH",
                "/api/v1/admin/catalog/attributes/" + materialId,
                writer.token(),
                Map.of("name", "Material type", "is_required", true, "sort_order", 2));
        assertEquals(200, attributeUpdate.status(), attributeUpdate.body());

        Result metadata = call("GET", "/api/v1/admin/catalog/meta", writer.token(), null);
        assertEquals(200, metadata.status(), metadata.body());
        assertTrue(containsAttribute(
                metadata.data().get("data").get("attributes"), materialId, "Material type"));
        assertTrue(containsOptionLabel(
                metadata.data().get("data").get("attributes"), colorId, blackOptionId, "Ink black"));

        String suffix = UUID.randomUUID().toString().replace("-", "");
        long parentId = createProduct(
                writer,
                "PARENT-" + suffix,
                "Tee",
                120000,
                null,
                "ACTIVE",
                List.of(
                        Map.of("attribute_id", materialId, "text_value", "cotton"),
                        Map.of("attribute_id", colorId, "option_id", blackOptionId)));
        long childId = createProduct(
                writer,
                "CHILD-" + suffix,
                "Tee black",
                135000,
                parentId,
                "ACTIVE",
                List.of(
                        Map.of("attribute_id", materialId, "text_value", "linen"),
                        Map.of("attribute_id", colorId, "option_id", blackOptionId)));

        Result childDetail = call(
                "GET", "/api/v1/admin/products/" + childId, writer.token(), null);
        assertEquals(200, childDetail.status(), childDetail.body());
        var childData = childDetail.data().get("data");
        assertEquals(parentId, childData.get("parent_product_id").asLong());
        assertEquals(parentId, childData.get("parent_product").get("product_id").asLong());
        assertEquals("PARENT-" + suffix, childData.get("parent_product").get("sku").asText());
        assertEquals(
                "cotton",
                findAttributeValue(
                        childData.get("parent_product").get("attribute_values"), materialId)
                        .get("text_value").asText());
        assertEquals(
                "linen",
                findAttributeValue(childData.get("attribute_values"), materialId)
                        .get("text_value").asText());
        assertEquals(135000, childData.get("selling_price").asLong());
        assertEquals(
                "Ink black",
                findAttributeValue(childData.get("attribute_values"), colorId)
                        .get("option_label").asText());

        Result parentDetail = call(
                "GET", "/api/v1/admin/products/" + parentId, writer.token(), null);
        assertEquals(200, parentDetail.status(), parentDetail.body());
        var parentData = parentDetail.data().get("data");
        assertEquals(1, parentData.get("children").size());
        assertEquals(childId, parentData.get("child_product_ids").get(0).asLong());
        assertEquals(childId, parentData.get("children").get(0).get("product_id").asLong());
        assertEquals(
                "linen",
                findAttributeValue(
                        parentData.get("children").get(0).get("attribute_values"), materialId)
                        .get("text_value").asText());

        Result publicDetail = call(
                "GET", "/api/v1/catalog/products/" + childId, null, null);
        assertEquals(200, publicDetail.status(), publicDetail.body());
        assertEquals(2, publicDetail.data().get("data").get("attribute_values").size());
    }

    @Test
    void patchReplacesAttributeValuesAndOmittedFieldRetainsValues() throws Exception {
        Employee writer = catalogWriter();
        long materialId = createAttribute(writer, "TEXT", "PATCH_MATERIAL", "Patch material", false);
        String sku = "PATCH-" + UUID.randomUUID().toString().replace("-", "");

        long productId = createProduct(
                writer,
                sku,
                "Patchable product",
                50000,
                null,
                "DRAFT",
                List.of(Map.of("attribute_id", materialId, "text_value", "cotton")));

        Result replaced = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of("attribute_values",
                        List.of(Map.of("attribute_id", materialId, "text_value", "wool"))));
        assertEquals(200, replaced.status(), replaced.body());
        assertEquals(
                "wool",
                findAttributeValue(replaced.data().get("data").get("attribute_values"), materialId)
                        .get("text_value").asText());

        Result omitted = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of("status", "INACTIVE"));
        assertEquals(200, omitted.status(), omitted.body());
        assertEquals(
                "wool",
                findAttributeValue(omitted.data().get("data").get("attribute_values"), materialId)
                        .get("text_value").asText());

        Result cleared = call(
                "PATCH",
                "/api/v1/admin/products/" + productId,
                writer.token(),
                Map.of("attribute_values", List.of()));
        assertEquals(200, cleared.status(), cleared.body());
        assertEquals(0, cleared.data().get("data").get("attribute_values").size());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM product_attribute_values WHERE product_id = ?",
                        Integer.class,
                        productId));
    }

    @Test
    void activeProductMissingRequiredAttributeIsRejectedAndRolledBack() throws Exception {
        Employee writer = catalogWriter();
        createAttribute(writer, "TEXT", "REQUIRED_MATERIAL", "Required material", true);
        String sku = "ROLLBACK-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> body = new HashMap<>();
        body.put("sku", sku);
        body.put("name", "Invalid active product");
        body.put("selling_price", 10000);
        body.put("status", "ACTIVE");

        Result result = call("POST", "/api/v1/admin/products", writer.token(), body);

        assertEquals(400, result.status(), result.body());
        assertEquals(
                0,
                db.queryForObject("SELECT COUNT(*) FROM products WHERE sku = ?", Integer.class, sku));
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

    private long createAttribute(
            Employee writer,
            String typeCode,
            String codePrefix,
            String name,
            boolean required) throws Exception {
        Long typeId = db.queryForObject(
                "SELECT id FROM attribute_types WHERE code = ?", Long.class, typeCode);
        String code = codePrefix + "_" + UUID.randomUUID().toString().replace("-", "");

        Result result = call(
                "POST",
                "/api/v1/admin/catalog/attributes",
                writer.token(),
                Map.of(
                        "attribute_type_id", typeId,
                        "code", code,
                        "name", name,
                        "is_required", required,
                        "is_variant_defining", false,
                        "sort_order", 0));

        assertEquals(201, result.status(), result.body());
        long id = result.data().get("data").get("id").asLong();
        createdAttributes.add(id);
        return id;
    }

    private long createOption(
            Employee writer,
            long attributeId,
            String value,
            String label) throws Exception {
        Result result = call(
                "POST",
                "/api/v1/admin/catalog/attributes/" + attributeId + "/options",
                writer.token(),
                Map.of("value", value, "label", label, "sort_order", 0));

        assertEquals(201, result.status(), result.body());
        long id = result.data().get("data").get("id").asLong();
        createdOptions.add(id);
        return id;
    }

    private long createProduct(
            Employee writer,
            String sku,
            String name,
            long price,
            Long parentId,
            String status,
            List<? extends Map<String, ?>> attributeValues) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("sku", sku);
        body.put("name", name);
        body.put("selling_price", price);
        body.put("status", status);
        body.put("attribute_values", attributeValues);
        if (parentId != null) body.put("parent_product_id", parentId);

        Result result = call("POST", "/api/v1/admin/products", writer.token(), body);
        assertEquals(201, result.status(), result.body());

        long id = result.data().get("data").get("product_id").asLong();
        products.add(id);
        return id;
    }

    private static boolean containsAttribute(
            tools.jackson.databind.JsonNode attributes,
            long attributeId,
            String name) {
        for (var attribute : attributes) {
            if (attribute.get("id").asLong() == attributeId
                    && name.equals(attribute.get("name").asText())) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsOptionLabel(
            tools.jackson.databind.JsonNode attributes,
            long attributeId,
            long optionId,
            String label) {
        for (var attribute : attributes) {
            if (attribute.get("id").asLong() != attributeId) continue;
            for (var option : attribute.get("options")) {
                if (option.get("id").asLong() == optionId
                        && label.equals(option.get("label").asText())) {
                    return true;
                }
            }
        }
        return false;
    }

    private static tools.jackson.databind.JsonNode findAttributeValue(
            tools.jackson.databind.JsonNode values,
            long attributeId) {
        for (var value : values) {
            if (value.get("attribute_id").asLong() == attributeId) {
                return value;
            }
        }
        throw new AssertionError("Attribute value not found: " + attributeId);
    }
}
