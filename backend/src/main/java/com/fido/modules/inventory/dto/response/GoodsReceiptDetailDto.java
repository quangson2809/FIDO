package com.fido.modules.inventory.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record GoodsReceiptDetailDto(
        Long receipt_id,
        String receipt_code,
        Long supplier_id,
        String receipt_status,
        LocalDate receipt_date,
        LocalDateTime confirmed_at,
        LocalDateTime created_at,
        Long created_by_account_id,
        Long confirmed_by_account_id,
        String note,
        List<GoodsReceiptItemDto> items,
        LocalDateTime updated_at
) {
}
