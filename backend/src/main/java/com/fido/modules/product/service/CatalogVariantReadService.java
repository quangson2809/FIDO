package com.fido.modules.product.service;

import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductPrimaryImageView;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import java.math.BigDecimal;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cross-module read contract for concrete catalog variants.
 * Callers outside product do not access product repositories directly.
 */
@Service
@Transactional(readOnly = true)
public class CatalogVariantReadService {

    private final ProductVariantRepository variants;
    private final ProductRepository products;
    private final ProductImageRepository images;
    private final SizeValueRepository sizes;
    private final ColorRepository colors;
    private final InventoryAvailabilityService inventory;

    public CatalogVariantReadService(
            ProductVariantRepository variants,
            ProductRepository products,
            ProductImageRepository images,
            SizeValueRepository sizes,
            ColorRepository colors,
            InventoryAvailabilityService inventory
    ) {
        this.variants = variants;
        this.products = products;
        this.images = images;
        this.sizes = sizes;
        this.colors = colors;
        this.inventory = inventory;
    }

    public VariantView get(Long variantId) {
        return getAll(List.of(variantId))
                .get(variantId);
    }

    public Map<Long, VariantView> getAll(
            Collection<Long> variantIds
    ) {
        if (variantIds == null || variantIds.isEmpty()) {
            return Map.of();
        }

        var requestedIds = variantIds.stream()
                .distinct()
                .toList();

        Map<Long, ProductVariant> variantsById = variants
                .findAllByVariantIdIn(requestedIds)
                .stream()
                .collect(Collectors.toMap(
                        ProductVariant::getVariantId,
                        Function.identity()
                ));

        for (Long variantId : requestedIds) {
            if (!variantsById.containsKey(variantId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
        }

        var productIds = variantsById.values()
                .stream()
                .map(ProductVariant::getProductId)
                .distinct()
                .toList();

        Map<Long, Product> productsById = products
                .findAllByProductIdIn(productIds)
                .stream()
                .collect(Collectors.toMap(
                        Product::getProductId,
                        Function.identity()
                ));

        Map<Long, String> primaryImagesByProductId =
                primaryImagesByProductId(productIds);

        Map<Long, SizeValue> sizesById = sizes
                .findAllBySizeValueIdIn(
                        variantsById.values()
                                .stream()
                                .map(ProductVariant::getSizeValueId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(
                        SizeValue::getSizeValueId,
                        Function.identity()
                ));

        Map<Long, Color> colorsById = colors
                .findAllByColorIdIn(
                        variantsById.values()
                                .stream()
                                .map(ProductVariant::getColorId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(
                        Color::getColorId,
                        Function.identity()
                ));

        Map<Long, Integer> availabilityByVariantId =
                inventory.availableQuantities(requestedIds);

        var result = new LinkedHashMap<Long, VariantView>();

        for (Long variantId : requestedIds) {
            ProductVariant variant = variantsById.get(variantId);

            Product product = required(
                    productsById,
                    variant.getProductId(),
                    "Variant references missing product"
            );

            SizeValue size = required(
                    sizesById,
                    variant.getSizeValueId(),
                    "Variant references missing size"
            );

            Color color = required(
                    colorsById,
                    variant.getColorId(),
                    "Variant references missing color"
            );

            BigDecimal unitPrice = variant.getOverridePrice() == null
                    ? product.getBasePrice()
                    : variant.getOverridePrice();

            result.put(
                    variantId,
                    new VariantView(
                            variant.getVariantId(),
                            product.getProductId(),
                            product.getName(),
                            primaryImagesByProductId.get(product.getProductId()),
                            variant.getSku(),
                            size.getDisplayName(),
                            color.getName(),
                            unitPrice,
                            product.getSaleStatus(),
                            variant.getSaleStatus(),
                            availabilityByVariantId.getOrDefault(
                                    variantId,
                                    0
                            )
                    )
            );
        }

        return Map.copyOf(result);
    }

    /**
     * Resolves only images that still exist in the current catalog. Missing variants or images
     * intentionally produce no entry so historical order reads can fall back to null.
     */
    public Map<Long, String> primaryImagesByVariantIds(
            Collection<Long> variantIds
    ) {
        if (variantIds == null || variantIds.isEmpty()) {
            return Map.of();
        }

        List<ProductVariant> existingVariants = variants.findAllByVariantIdIn(
                variantIds.stream().distinct().toList()
        );

        Map<Long, String> primaryImagesByProductId = primaryImagesByProductId(
                existingVariants.stream()
                        .map(ProductVariant::getProductId)
                        .distinct()
                        .toList()
        );

        return existingVariants.stream()
                .filter(variant -> primaryImagesByProductId.containsKey(
                        variant.getProductId()
                ))
                .collect(Collectors.toUnmodifiableMap(
                        ProductVariant::getVariantId,
                        variant -> primaryImagesByProductId.get(
                                variant.getProductId()
                        )
                ));
    }

    private Map<Long, String> primaryImagesByProductId(
            Collection<Long> productIds
    ) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }

        return images.findPrimaryImagesByProductIdIn(productIds)
                .stream()
                .collect(Collectors.toMap(
                        ProductPrimaryImageView::getProductId,
                        ProductPrimaryImageView::getImageUrl
                ));
    }

    private <T> T required(
            Map<Long, T> values,
            Long id,
            String message
    ) {
        T value = values.get(id);

        if (value == null) {
            throw new IllegalStateException(message);
        }

        return value;
    }

    public record VariantView(
            Long variantId,
            Long productId,
            String productName,
            String primaryImage,
            String sku,
            String size,
            String color,
            BigDecimal unitPrice,
            String productSaleStatus,
            String variantSaleStatus,
            Integer availableQuantity
    ) {

        public boolean purchasable() {
            return CatalogPolicy.ON_SALE.equals(productSaleStatus)
                    && CatalogPolicy.ON_SALE.equals(variantSaleStatus)
                    && availableQuantity != null
                    && availableQuantity > 0;
        }
    }
}
