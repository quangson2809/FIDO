package com.fido.modules.order.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ReturnReceiptDto(
        long id,
        long order_id,
        String source_operation_id,
        long received_by,
        String reason,
        LocalDateTime created_at,
        List<Line> items) {
    public record Line(
            long order_item_id,
            int received_quantity,
            int sellable_quantity,
            String condition_code,
            String disposition) {}
}
