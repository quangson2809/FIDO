package com.fido.modules.product.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminProductSummaryDto(
        Long product_id,
        String name,
        String image_url,
        Long category_id,
        Long brand_id,
        Long size_system_id,
        BigDecimal base_price,
        String sale_status,
        LocalDateTime created_at,
        LocalDateTime updated_at
) {
}
