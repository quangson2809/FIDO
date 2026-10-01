package com.fido.modules.inventory.service;

import java.time.LocalDateTime;

public record InventoryTransactionFilter(
        Long variantId,
        String transactionType,
        Long orderId,
        Long goodsReceiptId,
        Long actorAccountId,
        LocalDateTime from,
        LocalDateTime to,
        Integer page,
        Integer pageSize
) {
}
