package com.fido.modules.inventory.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record GoodsReceiptSummaryDto(
        Long receipt_id,
        String receipt_code,
        Long supplier_id,
        String receipt_status,
        LocalDate receipt_date,
        LocalDateTime confirmed_at,
        LocalDateTime created_at
) {
}
