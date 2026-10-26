package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record GoodsReceiptDetailDto(
        Long receipt_id,
        String receipt_code,
        Long supplier_id,
        Long warehouse_id,
        String receipt_status,
        LocalDateTime confirmed_at,
        LocalDateTime created_at,
        Long created_by_account_id,
        Long confirmed_by_account_id,
        List<GoodsReceiptItemDto> items,
        LocalDateTime updated_at) {}
