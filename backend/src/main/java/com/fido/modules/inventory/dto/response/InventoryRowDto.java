package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;

public record InventoryRowDto(
        Long variant_id,
        String sku,
        Long product_id,
        String product_name,
        String size,
        String color,
        String sale_status,
        Integer available_quantity,
        LocalDateTime updated_at
) {
}
