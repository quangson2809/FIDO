package com.fido.modules.inventory.dto.response;

/** Read-only reconciliation result. A mismatch is reported, never repaired by this DTO/service. */
public record InventoryReconciliationRowDto(
        Long warehouse_id,
        Long product_id,
        Integer balance_quantity,
        Integer balance_version,
        Long ledger_quantity,
        Long movement_count,
        boolean quantity_matches,
        boolean version_matches,
        boolean consistent) {}
