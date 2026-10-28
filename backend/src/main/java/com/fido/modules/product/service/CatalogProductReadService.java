package com.fido.modules.product.service;

import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CatalogProductReadService {
    private final ProductRepository products;
    private final InventoryAvailabilityService inventory;
    private final ProductImageReadService images;

    public CatalogProductReadService(
            ProductRepository products,
            InventoryAvailabilityService inventory,
            ProductImageReadService images) {
        this.products = products;
        this.inventory = inventory;
        this.images = images;
    }

    public ProductView get(Long productId) {
        return getAll(java.util.List.of(productId)).get(productId);
    }

    public Map<Long, ProductView> getAll(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) return Map.of();
        var ids = productIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();

        Map<Long, Product> byId = new HashMap<>();
        products.findAllByProductIdIn(ids).forEach(p -> byId.put(p.getProductId(), p));
        for (Long id : ids) {
            if (!byId.containsKey(id) || byId.get(id).isDeleted()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
            }
        }

        Map<Long, String> imageById = images.representativeByProductIds(ids);
        Map<Long, Integer> stockById = inventory.availableQuantities(ids);
        Map<Long, ProductView> result = new HashMap<>();
        for (Long id : ids) {
            Product product = byId.get(id);
            int available = stockById.getOrDefault(id, 0);
            result.put(
                    id,
                    new ProductView(
                            product.getProductId(),
                            product.getName(),
                            product.getSku(),
                            imageById.get(id),
                            product.getSellingPrice(),
                            product.getStatus(),
                            available,
                            "ACTIVE".equals(product.getStatus()) && available > 0));
        }
        return Map.copyOf(result);
    }

    public record ProductView(
            Long productId,
            String productName,
            String sku,
            String imageUrl,
            Long unitPrice,
            String status,
            Integer availableQuantity,
            boolean purchasable) {
        /** Compatibility adapter for older test fixtures; production money stays integer VND. */
        public ProductView(
                Long productId, String productName, String sku, String imageUrl,
                BigDecimal unitPrice, String status, Integer availableQuantity, boolean purchasable) {
            this(productId, productName, sku, imageUrl, exactVnd(unitPrice), status,
                    availableQuantity, purchasable);
        }

        private static Long exactVnd(BigDecimal amount) {
            return amount == null ? null : amount.longValueExact();
        }
    }
}
