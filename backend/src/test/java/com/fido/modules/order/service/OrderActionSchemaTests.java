package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.modules.order.dto.request.OrderActionRequest;

import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.media.Schema;

import org.junit.jupiter.api.Test;

import java.util.List;

class OrderActionSchemaTests {
    @Test
    void publishedSchemaRetainsRequiredStringActionAndItsExistingVocabulary() {
        var request =
                ModelConverters.getInstance()
                        .readAll(OrderActionRequest.class)
                        .get("OrderActionRequest");
        Schema<?> action = (Schema<?>) request.getProperties().get("action");
        assertTrue(request.getRequired().contains("action"));
        assertEquals("string", action.getType());
        assertEquals(
                List.of(
                        "CONFIRM",
                        "START_PREPARING",
                        "DISPATCH",
                        "MARK_DELIVERY_FAILED",
                        "RETRY_DELIVERY",
                        "CANCEL"),
                action.getEnum());
    }
}
