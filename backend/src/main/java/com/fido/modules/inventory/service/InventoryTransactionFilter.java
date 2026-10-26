package com.fido.modules.inventory.service;

import java.time.LocalDateTime;

public record InventoryTransactionFilter(
        Long productId,
        String transactionType,
        Long orderItemId,
        Long goodsReceiptItemId,
        Long actorAccountId,
        LocalDateTime from,
        LocalDateTime to,
        Integer page,
        Integer pageSize) {}
