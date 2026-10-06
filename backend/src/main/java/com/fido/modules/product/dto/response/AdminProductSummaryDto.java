package com.fido.modules.product.dto.response;
import java.math.BigDecimal;
import java.time.LocalDateTime;
<<<<<<< HEAD
public record AdminProductSummaryDto(Long product_id, String name, Long category_id, Long brand_id,
                                     Long size_system_id, BigDecimal base_price, String sale_status,
                                     LocalDateTime created_at, LocalDateTime updated_at) {}
=======

public record AdminProductSummaryDto(
        Long product_id,
        String name,
        String thumbnail,
        Long category_id,
        Long brand_id,
        Long size_system_id,
        BigDecimal base_price,
        String sale_status,
        LocalDateTime created_at,
        LocalDateTime updated_at
) {
}
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
