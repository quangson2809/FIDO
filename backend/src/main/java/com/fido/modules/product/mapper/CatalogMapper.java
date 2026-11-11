package com.fido.modules.product.mapper;

import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ProductImageDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;

public final class CatalogMapper {

    private CatalogMapper() {}

    public static CategoryDto category(Category category) {
        return new CategoryDto(
                category.getCategoryId(),
                category.getParentCategoryId(),
                category.getName(),
                category.getSlug(),
                category.getStatus());
    }

    public static BrandDto brand(Brand brand) {
        if (brand == null) return null;
        return new BrandDto(
                brand.getBrandId(), brand.getName(), brand.getSlug(), brand.getStatus());
    }

    public static ProductImageDto image(ProductImage image) {
        return new ProductImageDto(
                image.getImageId(),
                image.getImageUrl(),
                Boolean.TRUE.equals(image.getIsPrimary()),
                image.getSortOrder());
    }

    public static AdminProductSummaryDto adminSummary(Product product, String thumbnail) {
        return new AdminProductSummaryDto(
                product.getProductId(),
                product.getParentProductId(),
                product.getSku(),
                product.getName(),
                thumbnail,
                product.getCategoryId(),
                product.getBrandId(),
                product.getSellingPrice(),
                product.getCostPrice(),
                product.getStatus(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }

    public static ProductSummaryDto publicSummary(
            Product product, String thumbnail, Category category, Brand brand) {
        return new ProductSummaryDto(
                product.getProductId(),
                product.getParentProductId(),
                product.getSku(),
                product.getName(),
                product.getSlug(),
                thumbnail,
                category == null ? null : category(category),
                brand(brand),
                product.getSellingPrice(),
                product.getStatus());
    }
}
