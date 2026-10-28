package com.fido.modules.inventory.dto.response;

import java.time.LocalDateTime;

public record InventoryRowDto(
        Long warehouse_id,
        Long product_id,
        String sku,
        String product_name,
        Integer available_quantity,
        Integer version,
        LocalDateTime updated_at) {}
