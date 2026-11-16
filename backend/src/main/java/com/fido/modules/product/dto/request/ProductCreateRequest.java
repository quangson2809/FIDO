package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import tools.jackson.databind.annotation.JsonDeserialize;

import java.util.List;

public record ProductCreateRequest(
        // ID Product cha đã tồn tại; null nghĩa tạo Product gốc, không dùng làm nguồn kế thừa giá
        // hoặc SKU.
        @Positive Long parent_product_id,
        @Positive Long category_id,
        @Positive Long brand_id,
        @Size(max = 255) String name,
        @Size(max = 200) String slug,
        @NotBlank @Size(max = 100) String sku,
        String description,
        // Giá riêng của Product, tính bằng VND nguyên; không nhận chuỗi hoặc số thập phân.
        @NotNull @PositiveOrZero @JsonDeserialize(using = IntegerVndDeserializer.class)
                Long selling_price,
        @PositiveOrZero @JsonDeserialize(using = IntegerVndDeserializer.class) Long cost_price,
        @Pattern(regexp = "DRAFT|ACTIVE|INACTIVE|ARCHIVED") String status,
        // Đây là ID của AttributeOption đã có; BE tự suy ra Attribute, không phải ID bảng
        // ProductAttributeValue.
        List<@NotNull @Positive Long> attribute_value_ids) {}
