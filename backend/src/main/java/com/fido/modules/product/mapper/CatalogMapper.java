package com.fido.modules.product.mapper;

import com.fido.modules.product.dto.response.*;
import com.fido.modules.product.entity.*;
import java.util.List;

public final class CatalogMapper {
    private CatalogMapper() {}

    public static CategoryDto category(Category c) {
        return new CategoryDto(c.getCategoryId(), c.getParentCategoryId(), c.getName());
    }
    public static BrandDto brand(Brand b) {
        return b == null ? null : new BrandDto(b.getBrandId(), b.getName());
    }
    public static SizeValueDto sizeValue(SizeValue s) {
        return new SizeValueDto(s.getSizeValueId(), s.getSizeSystemId(), s.getCode(), s.getDisplayName(), s.getSortOrder());
    }
    public static SizeSystemDto sizeSystem(SizeSystem s, List<SizeValueDto> values) {
        return new SizeSystemDto(s.getSizeSystemId(), s.getCode(), s.getName(), values);
    }
    public static ColorDto color(Color c) {
        return new ColorDto(c.getColorId(), c.getCode(), c.getName());
    }
    public static ProductImageDto image(ProductImage i) {
        return new ProductImageDto(i.getImageId(), i.getImageUrl(), i.getAltText());
    }
    public static AdminProductSummaryDto adminSummary(Product p) {
        return new AdminProductSummaryDto(p.getProductId(), p.getName(), p.getCategoryId(), p.getBrandId(),
                p.getSizeSystemId(), p.getBasePrice(), p.getSaleStatus(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
