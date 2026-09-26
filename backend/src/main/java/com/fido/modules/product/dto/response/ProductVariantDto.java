package com.fido.modules.product.dto.response;
import java.math.BigDecimal;
public record ProductVariantDto(Long variant_id, SizeValueDto size, ColorDto color, String sku,
                                BigDecimal effective_price, String sale_status, Integer available_quantity) {}
