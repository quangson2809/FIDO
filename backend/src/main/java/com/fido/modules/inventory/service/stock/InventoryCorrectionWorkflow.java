package com.fido.modules.inventory.service.stock;

import com.fido.modules.inventory.service.OperationalWarehouseService;
import com.fido.modules.inventory.service.stock.InventoryPostingService.InventoryMovement;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Component
class InventoryCorrectionWorkflow {
    private final InventoryPostingService posting;
    private final OperationalWarehouseService warehouse;

    InventoryCorrectionWorkflow(
            InventoryPostingService posting, OperationalWarehouseService warehouse) {
        this.posting = posting;
        this.warehouse = warehouse;
    }

    void post(Long actor, Long productId, int delta, String key, Long receiptItemId) {
        if (delta == 0) return;
        posting.post(
                new InventoryMovement(
                        actor,
                        warehouse.requireOperationalWarehouseId(),
                        productId,
                        delta,
                        "ADJUSTMENT",
                        null,
                        receiptItemId,
                        null,
                        receiptItemId == null ? "COUNT_CORRECTION" : "DATA_CORRECTION"),
                LocalDateTime.now(ZoneOffset.UTC),
                key,
                "INVENTORY_SOURCE_CONFLICT");
    }
}
