package com.fido.modules.product.service;

import com.fido.modules.product.entity.Product;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CatalogProductReadService {
    private final ProductRepository products;
    private final ProductImageReadService images;

    public CatalogProductReadService(
            ProductRepository products,
            ProductImageReadService images) {
        this.products = products;
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
        Map<Long, ProductView> result = new HashMap<>();
        for (Long id : ids) {
            Product product = byId.get(id);
            result.put(
                    id,
                    new ProductView(
                            product.getProductId(),
                            product.getName(),
                            product.getSku(),
                            imageById.get(id),
                            product.getSellingPrice(),
                            product.getStatus()));
        }
        return Map.copyOf(result);
    }

    public record ProductView(
            Long productId,
            String productName,
            String sku,
            String imageUrl,
            Long unitPrice,
            String status) {}
}
