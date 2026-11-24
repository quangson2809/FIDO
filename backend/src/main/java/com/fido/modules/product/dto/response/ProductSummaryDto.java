package com.fido.modules.product.dto.response;

public record ProductSummaryDto(
        Long product_id,
        Long parent_product_id,
        String sku,
        String name,
        String slug,
        String thumbnail,
        CategoryDto category,
        BrandDto brand,
        Long selling_price,
        String status,
        Long matched_product_id,
        String matched_sku) {
    public ProductSummaryDto(
            Long product_id,
            Long parent_product_id,
            String sku,
            String name,
            String slug,
            String thumbnail,
            CategoryDto category,
            BrandDto brand,
            Long selling_price,
            String status) {
        this(
                product_id,
                parent_product_id,
                sku,
                name,
                slug,
                thumbnail,
                category,
                brand,
                selling_price,
                status,
                null,
                null);
    }

    public ProductSummaryDto withMatch(Long matchedId, String matchedSku, Long matchedPrice) {
        return new ProductSummaryDto(
                product_id,
                parent_product_id,
                sku,
                name,
                slug,
                thumbnail,
                category,
                brand,
                matchedPrice,
                status,
                matchedId,
                matchedSku);
    }
}
