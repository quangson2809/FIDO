package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;

public record GoodsReceiptSummaryDto(
        Long receipt_id,
        String receipt_code,
        Long supplier_id,
        Long warehouse_id,
        String receipt_status,
        LocalDateTime confirmed_at,
        LocalDateTime created_at) {}
