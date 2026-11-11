package com.fido.modules.product.service;

import com.fido.modules.product.repository.ProductAttributeValueRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository.OrderSnapshotValue;
import org.junit.jupiter.api.Test;
import org.springframework.data.projection.SpelAwareProxyProjectionFactory;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OrderProductSnapshotServiceTests {
    private final ProductAttributeValueRepository values = mock(ProductAttributeValueRepository.class);
    private final OrderProductSnapshotService snapshots = new OrderProductSnapshotService(new ObjectMapper(), values);

    @Test
    void emptySelectionDoesNotQueryAndProductsWithoutOptionsKeepEmptyJsonArray() {
        assertEquals(Map.of(), snapshots.attributeSnapshots(null));
        assertEquals(Map.of(), snapshots.attributeSnapshots(List.of()));
        verifyNoInteractions(values);
        when(values.findOrderSnapshots(List.of(1L, 2L))).thenReturn(List.of());
        assertEquals(Map.of(1L, "[]", 2L, "[]"), snapshots.attributeSnapshots(List.of(1L, 2L)));
    }

    @Test
    void refusesSnapshotsThatCannotFitTheExistingStorageContract() {
        var projections = new SpelAwareProxyProjectionFactory();
        List<OrderSnapshotValue> rows = IntStream.rangeClosed(1, 12)
                .mapToObj(index -> projections.createProjection(OrderSnapshotValue.class, Map.of(
                        "productId", 1L, "attributeId", (long) index,
                        "attributeCode", "ATTRIBUTE_" + index, "attributeName", "Attribute " + index,
                        "optionId", (long) index, "optionValue", "VALUE_" + index,
                        "optionLabel", "x".repeat(150))))
                .toList();
        when(values.findOrderSnapshots(List.of(1L))).thenReturn(rows);

        var failure = assertThrows(ResponseStatusException.class,
                () -> snapshots.attributeSnapshots(List.of(1L)));
        assertEquals(422, failure.getStatusCode().value());
        assertEquals("ORDER_ATTRIBUTE_SNAPSHOT_TOO_LARGE", failure.getReason());
    }
}
