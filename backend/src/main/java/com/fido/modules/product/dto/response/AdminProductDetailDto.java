package com.fido.modules.product.dto.response;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
public record AdminProductDetailDto(
        Long product_id, String name, String description, CategoryDto category, BrandDto brand,
        SizeSystemDto size_system, String gender, String season, String style, String material_care,
        BigDecimal base_price, String sale_status, List<ProductImageDto> images, List<AdminVariantDto> variants,
        Long category_id, Long brand_id, Long size_system_id, LocalDateTime created_at, LocalDateTime updated_at) {}
