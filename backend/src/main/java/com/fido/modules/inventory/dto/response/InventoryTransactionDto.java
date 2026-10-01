package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;

public record InventoryTransactionDto(
        Long txn_id,
        Long variant_id,
        Integer quantity_delta,
        String transaction_type,
        Long order_id,
        Long goods_receipt_id,
        Long actor_account_id,
        String reason,
        LocalDateTime created_at
) {
}
