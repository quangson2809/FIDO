package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ReceiptCorrectionDto(
        long id,
        long goods_receipt_id,
        String source_operation_id,
        String reason,
        long created_by,
        LocalDateTime created_at,
        List<Line> items) {
    public record Line(
            long receipt_item_id,
            int before_quantity,
            int corrected_quantity,
            long before_unit_cost,
            long corrected_unit_cost,
            int quantity_delta,
            long value_delta) {}
}
