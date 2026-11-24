package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record StocktakeDto(
        long id,
        long warehouse_id,
        String status,
        String reason,
        long created_by,
        Long confirmed_by,
        LocalDateTime created_at,
        LocalDateTime confirmed_at,
        List<Line> items) {
    public record Line(
            long product_id,
            int expected_quantity,
            int counted_quantity,
            int expected_version,
            int difference) {}
}
