package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;

public record InventoryTransactionDto(
        Long txn_id,
        Long product_id,
        Long warehouse_id,
        Integer quantity_delta,
        String transaction_type,
        Long order_item_id,
        Long goods_receipt_item_id,
        Long reverses_transaction_id,
        Long actor_account_id,
        String reason,
        LocalDateTime created_at) {}
