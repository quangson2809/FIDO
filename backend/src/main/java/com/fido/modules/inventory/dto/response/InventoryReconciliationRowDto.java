package com.fido.modules.inventory.dto.response;

/** Chỉ báo sai lệch đối soát; kết quả này không tự sửa số dư hoặc lịch sử kho. */
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
