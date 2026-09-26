package com.fido.modules.product.dto.response;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public record AdminVariantDto(Long variant_id, Long product_id, Long size_value_id, Long color_id, String sku,
                              BigDecimal override_price, String sale_status, Integer available_quantity,
                              LocalDateTime created_at, LocalDateTime updated_at) {}
