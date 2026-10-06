package com.fido.modules.product.mapper;

import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ColorDto;
import com.fido.modules.product.dto.response.ProductImageDto;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.dto.response.SizeValueDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeSystem;
import com.fido.modules.product.entity.SizeValue;
import java.util.List;

public final class CatalogMapper {

    private CatalogMapper() {
    }

    public static CategoryDto category(Category category) {
        return new CategoryDto(
                category.getCategoryId(),
                category.getParentCategoryId(),
                category.getName()
        );
    }

    public static BrandDto brand(Brand brand) {
        if (brand == null) {
            return null;
        }

        return new BrandDto(
                brand.getBrandId(),
                brand.getName()
        );
    }

    public static SizeValueDto sizeValue(SizeValue sizeValue) {
        return new SizeValueDto(
                sizeValue.getSizeValueId(),
                sizeValue.getSizeSystemId(),
                sizeValue.getCode(),
                sizeValue.getDisplayName(),
                sizeValue.getSortOrder()
        );
    }

    public static SizeSystemDto sizeSystem(
            SizeSystem sizeSystem,
            List<SizeValueDto> values
    ) {
        return new SizeSystemDto(
                sizeSystem.getSizeSystemId(),
                sizeSystem.getCode(),
                sizeSystem.getName(),
                values
        );
    }

    public static ColorDto color(Color color) {
        return new ColorDto(
                color.getColorId(),
                color.getCode(),
                color.getName()
        );
    }

    public static ProductImageDto image(ProductImage image) {
        return new ProductImageDto(
                image.getImageId(),
                image.getImageUrl(),
                image.getAltText(),
                image.getSortOrder()
        );
    }

    public static AdminVariantDto adminVariant(
            ProductVariant variant,
            int availableQuantity
    ) {
        return new AdminVariantDto(
                variant.getVariantId(),
                variant.getProductId(),
                variant.getSizeValueId(),
                variant.getColorId(),
                variant.getSku(),
                variant.getOverridePrice(),
                variant.getSaleStatus(),
                availableQuantity,
                variant.getCreatedAt(),
                variant.getUpdatedAt()
        );
    }

<<<<<<< HEAD
    public static AdminProductSummaryDto adminSummary(Product product) {
        return new AdminProductSummaryDto(
                product.getProductId(),
                product.getName(),
=======
    public static AdminProductSummaryDto adminSummary(
            Product product,
            String thumbnail
    ) {
        return new AdminProductSummaryDto(
                product.getProductId(),
                product.getName(),
                thumbnail,
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
                product.getCategoryId(),
                product.getBrandId(),
                product.getSizeSystemId(),
                product.getBasePrice(),
                product.getSaleStatus(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
