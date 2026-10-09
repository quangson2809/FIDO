package com.fido.modules.product;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CatalogMasterDataHttpTests extends CatalogHttpSupport {

    @Test
    void sizeValueSynchronizationPreservesIdsAndRollsBackForbiddenMeaningChanges() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        String path = "/api/v1/admin/size-systems/" + fixture.systemId();
        var current = fixture.systemResponse().data().get("data").get("size_values");
        var retained = new java.util.ArrayList<Map<String, Object>>();
        for (var value : current) {
            retained.add(Map.of("size_value_id", value.get("size_value_id").asLong(),
                    "code", value.get("code").asText(), "display_name", value.get("display_name").asText(),
                    "sort_order", value.get("sort_order").asInt() + 10));
        }
        retained.add(Map.of("code", "EXTRA", "display_name", "Extra", "sort_order", -1));
        var added = call("PATCH", path, writer.token(), Map.of("size_values", retained));
        assertEquals(200, added.status(), added.body());
        assertEquals(current.size() + 1, added.data().get("data").get("size_values").size());
        assertEquals("EXTRA", added.data().get("data").get("size_values").get(0).get("code").asText());
        assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM size_values WHERE size_value_id=? AND size_system_id=?",
                Integer.class, fixture.sizeM(), fixture.systemId()));

        retained.remove(retained.size() - 1);
        var removed = call("PATCH", path, writer.token(), Map.of("size_values", retained));
        assertEquals(200, removed.status(), removed.body());
        assertEquals(current.size(), removed.data().get("data").get("size_values").size());
        String originalName = removed.data().get("data").get("name").asText();
        for (int index = 0; index < retained.size(); index++) {
            if (retained.get(index).get("size_value_id").equals(fixture.sizeM())) {
                var changed = new java.util.HashMap<>(retained.get(index));
                changed.put("display_name", "Different meaning");
                retained.set(index, changed);
            }
        }
        assertEquals(409, call("PATCH", path, writer.token(),
                Map.of("name", "Must roll back", "size_values", retained)).status());
        assertEquals(originalName, db.queryForObject("SELECT name FROM size_systems WHERE size_system_id=?",
                String.class, fixture.systemId()));
        assertEquals(409, call("PATCH", path, writer.token(), Map.of("size_values", List.of())).status());
    }

    @Test
    void masterDataCreationAndReferenceRules() throws Exception {
        Employee writer = employee(customRole(ensurePermission("CATALOG_WRITE")));
        var fixture = createCatalog(writer);
        long categoryId = fixture.categoryId();
        long brandId = fixture.brandId();
        long systemId = fixture.systemId();
        long colorId = fixture.colorId();
        var categoryResponse = fixture.categoryResponse();
        var brandResponse = fixture.brandResponse();
        var systemResponse = fixture.systemResponse();
        var colorResponse = fixture.colorResponse();
        var createProductResponse = fixture.createProductResponse();
        assertEquals(
                201,
                categoryResponse.status(),
                categoryResponse.body()
        );
        assertEquals(
                201,
                brandResponse.status(),
                brandResponse.body()
        );
        assertEquals(
                201,
                systemResponse.status(),
                systemResponse.body()
        );
        assertEquals(
                201,
                colorResponse.status(),
                colorResponse.body()
        );
        assertEquals(
                201,
                createProductResponse.status(),
                createProductResponse.body()
        );
        assertEquals(
                200,
                call(
                        "PATCH",
                        "/api/v1/admin/brands/" + brandId,
                        writer.token(),
                        Map.of(
                                "name",
                                "Brand updated " + UUID.randomUUID()
                        )
                ).status()
        );

        // A Category containing a Product cannot gain a child and cease to be a leaf.
        assertEquals(
                409,
                call(
                        "POST",
                        "/api/v1/admin/categories",
                        writer.token(),
                        Map.of(
                                "parent_category_id", categoryId,
                                "name", "Illegal child"
                        )
                ).status()
        );

        // Empty Category tree still rejects cycles.
        var categoryAResponse = call(
                "POST",
                "/api/v1/admin/categories",
                writer.token(),
                Map.of(
                        "name",
                        "A " + UUID.randomUUID()
                )
        );

        long categoryAId = categoryAResponse.data()
                .get("data")
                .get("category_id")
                .asLong();

        categories.add(categoryAId);

        var categoryBResponse = call(
                "POST",
                "/api/v1/admin/categories",
                writer.token(),
                Map.of(
                        "parent_category_id", categoryAId,
                        "name", "B " + UUID.randomUUID()
                )
        );

        long categoryBId = categoryBResponse.data()
                .get("data")
                .get("category_id")
                .asLong();

        categories.add(categoryBId);

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/categories/" + categoryAId,
                        writer.token(),
                        Map.of("parent_category_id", categoryBId)
                ).status()
        );

        // Referenced master meaning cannot be repurposed or removed.
        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/colors/" + colorId,
                        writer.token(),
                        Map.of("name", "Different meaning")
                ).status()
        );

        assertEquals(
                409,
                call(
                        "DELETE",
                        "/api/v1/admin/colors/" + colorId,
                        writer.token(),
                        null
                ).status()
        );

        assertEquals(
                409,
                call(
                        "PATCH",
                        "/api/v1/admin/size-systems/" + systemId,
                        writer.token(),
                        Map.of("size_values", List.of())
                ).status()
        );

        // Unreferenced masters can be deleted.
        var spareColorResponse = call(
                "POST",
                "/api/v1/admin/colors",
                writer.token(),
                Map.of(
                        "code", "SP-" + UUID.randomUUID(),
                        "name", "Spare"
                )
        );

        long spareColorId = spareColorResponse.data()
                .get("data")
                .get("color_id")
                .asLong();

        colors.add(spareColorId);

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/colors/" + spareColorId,
                        writer.token(),
                        null
                ).status()
        );

        colors.remove(spareColorId);

        var spareBrandResponse = call(
                "POST",
                "/api/v1/admin/brands",
                writer.token(),
                Map.of(
                        "name",
                        "Spare " + UUID.randomUUID()
                )
        );

        long spareBrandId = spareBrandResponse.data()
                .get("data")
                .get("brand_id")
                .asLong();

        brands.add(spareBrandId);

        assertEquals(
                204,
                call(
                        "DELETE",
                        "/api/v1/admin/brands/" + spareBrandId,
                        writer.token(),
                        null
                ).status()
        );

        brands.remove(spareBrandId);
    }
}
