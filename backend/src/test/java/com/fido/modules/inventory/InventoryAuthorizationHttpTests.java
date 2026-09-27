package com.fido.modules.inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;

class InventoryAuthorizationHttpTests extends InventoryHttpSupport {

    @Test
    void inventoryRequiresExplicitCapabilities() throws Exception {
        long readPermission = ensurePermission("INVENTORY_READ");
        long writePermission = ensurePermission("INVENTORY_WRITE");

        Employee reader = employee(
                capabilityRole(readPermission)
        );

        Employee writer = employee(
                capabilityRole(writePermission)
        );

        Employee plainAdmin = plainAdmin();

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/inventory",
                        plainAdmin.token(),
                        null
                ).status()
        );

        assertEquals(
                403,
                call(
                        "GET",
                        "/api/v1/admin/inventory",
                        writer.token(),
                        null
                ).status()
        );

        assertEquals(
                403,
                call(
                        "POST",
                        "/api/v1/admin/suppliers",
                        reader.token(),
                        Map.of(
                                "name", "Denied",
                                "usage_status", "ACTIVE"
                        )
                ).status()
        );
    }
}
