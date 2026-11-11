package com.fido.modules.product.dto.response;

import java.time.LocalDateTime;

public record AdminProductSummaryDto(
        Long product_id,
        Long parent_product_id,
        String sku,
        String name,
        String thumbnail,
        Long category_id,
        Long brand_id,
        Long selling_price,
        Long cost_price,
        String status,
        LocalDateTime created_at,
        LocalDateTime updated_at) {}
