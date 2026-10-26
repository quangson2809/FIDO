package com.fido.modules.product.service;

import com.fido.modules.product.entity.Product;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PromotionCatalogService {
    private final ProductRepository products;
    private final CategoryRepository categories;

    public PromotionCatalogService(ProductRepository products, CategoryRepository categories) {
        this.products = products;
        this.categories = categories;
    }

    public void validateTargets(Set<Long> productIds, Set<Long> categoryIds) {
        if (products.findAllByProductIdIn(productIds).size() != productIds.size()
                || categories.findAllByCategoryIdIn(categoryIds).size() != categoryIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm hoặc danh mục không tồn tại");
        }
    }

    public Set<Long> eligibleProducts(
            Collection<Long> requestedProductIds, String scope,
            Set<Long> explicitProductIds, Set<Long> categoryIds) {
        Set<Long> requested = Set.copyOf(requestedProductIds);
        if ("ALL".equals(scope)) return requested;
        Set<Long> eligible = new HashSet<>(explicitProductIds == null ? Set.of() : explicitProductIds);
        if ("CATEGORY".equals(scope)) {
            Set<Long> expanded = new HashSet<>(categoryIds == null ? Set.of() : categoryIds);
            var tree = categories.findAllByOrderByCategoryIdAsc();
            boolean changed;
            do {
                changed = false;
                for (var category : tree) {
                    if (category.getParentCategoryId() != null
                            && expanded.contains(category.getParentCategoryId())) {
                        changed |= expanded.add(category.getCategoryId());
                    }
                }
            } while (changed);
            products.findAllByProductIdIn(requested).stream()
                    .filter(p -> expanded.contains(p.getCategoryId()))
                    .map(Product::getProductId)
                    .forEach(eligible::add);
        }
        return requested.stream().filter(eligible::contains).collect(Collectors.toUnmodifiableSet());
    }
}
