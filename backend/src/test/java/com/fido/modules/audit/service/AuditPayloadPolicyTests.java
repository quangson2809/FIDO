package com.fido.modules.audit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Map;

class AuditPayloadPolicyTests {
    private final AuditPayloadPolicy policy = new AuditPayloadPolicy();
    private final ObjectMapper json = new ObjectMapper();

    @ParameterizedTest
    @EnumSource(AuditAction.class)
    void persistedAndHistoricalPayloadsUseTheSameDisclosureRules(AuditAction action)
            throws Exception {
        Map<String, Object> source =
                Map.of(
                        "status", "ACTIVE",
                        "code", "SAMPLE",
                        "active", true,
                        "quantity_delta", -2L,
                        "total_amount", 200_000L,
                        "slug", "payment-policy",
                        "phone", "0900000000",
                        "password", "never-return-this",
                        "nested", Map.of("token", "never-return-this"));

        Map<String, Object> visible = policy.redactForRead(action.name(), source);
        String persisted = policy.toJson(action, source);

        if (visible.isEmpty()) {
            assertNull(persisted);
        } else {
            assertEquals(json.readTree(json.writeValueAsString(visible)), json.readTree(persisted));
        }
    }

    @Test
    void orderPayloadKeepsOnlyApprovedScalarsAndCannotBeMutatedByTheCaller() throws Exception {
        Map<String, Object> source =
                Map.of(
                        "status", "CONFIRMED",
                        "total_amount", 200_000L,
                        "shipping_status", Map.of("token", "secret"),
                        "email", "private@example.test",
                        "reason", "unrestricted free text");

        var visible = policy.redactForRead(AuditAction.ORDER_CONFIRM.name(), source);
        assertEquals(Map.of("status", "CONFIRMED", "total_amount", 200_000L), visible);
        assertThrows(UnsupportedOperationException.class, () -> visible.put("email", "new value"));
        assertEquals(
                json.readTree(json.writeValueAsString(visible)),
                json.readTree(policy.toJson(AuditAction.ORDER_CONFIRM, source)));
    }

    @Test
    void unknownActionsAndFullyRedactedPayloadsNeverDiscloseInput() {
        var source = Map.of("email", "private@example.test");

        assertTrue(policy.redactForRead("UNKNOWN_ACTION", source).isEmpty());
        assertTrue(policy.redactForRead(null, source).isEmpty());
        assertTrue(policy.redactForRead(AuditAction.ORDER_CONFIRM.name(), source).isEmpty());
        assertNull(policy.toJson(AuditAction.ORDER_CONFIRM, source));
        assertNull(policy.toJson(AuditAction.ORDER_CONFIRM, null));
        assertNull(policy.redactForRead(AuditAction.ORDER_CONFIRM.name(), null));
    }
}
