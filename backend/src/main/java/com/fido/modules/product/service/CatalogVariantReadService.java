package com.fido.modules.product.service;

import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cross-module read contract for one concrete catalog Variant.
 * No caller outside product needs direct access to product repositories.
 */
@Service
@Transactional(readOnly = true)
public class CatalogVariantReadService {

    private final ProductVariantRepository variants;
    private final ProductRepository products;
    private final SizeValueRepository sizes;
    private final ColorRepository colors;
    private final InventoryAvailabilityService inventory;

    public CatalogVariantReadService(
            ProductVariantRepository variants,
            ProductRepository products,
            SizeValueRepository sizes,
            ColorRepository colors,
            InventoryAvailabilityService inventory
    ) {
        this.variants = variants;
        this.products = products;
        this.sizes = sizes;
        this.colors = colors;
        this.inventory = inventory;
    }

    public VariantView get(Long variantId) {
        ProductVariant variant = variants.findById(variantId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );

        Product product = products.findById(variant.getProductId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Variant references missing product"
                        )
                );

        var size = sizes.findById(variant.getSizeValueId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Variant references missing size"
                        )
                );

        var color = colors.findById(variant.getColorId())
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Variant references missing color"
                        )
                );

        BigDecimal unitPrice = variant.getOverridePrice() == null
                ? product.getBasePrice()
                : variant.getOverridePrice();

        return new VariantView(
                variant.getVariantId(),
                product.getProductId(),
                product.getName(),
                size.getDisplayName(),
                color.getName(),
                unitPrice,
                product.getSaleStatus(),
                variant.getSaleStatus(),
                inventory.availableQuantity(variantId)
        );
    }

    public record VariantView(
            Long variantId,
            Long productId,
            String productName,
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
