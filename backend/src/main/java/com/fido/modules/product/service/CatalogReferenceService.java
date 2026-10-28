package com.fido.modules.product.service;

import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CatalogReferenceService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final BrandRepository brands;

    public CatalogReferenceService(
            ProductRepository products,
            CategoryRepository categories,
            BrandRepository brands) {
        this.products = products;
        this.categories = categories;
        this.brands = brands;
    }

    public Product product(Long productId) {
        Product product = products.findById(productId).orElseThrow(CatalogReferenceService::notFound);
        if (product.isDeleted()) throw notFound();
        return product;
    }

    @Transactional
    public Product productForUpdate(Long productId) {
        Product product =
                products.findByIdForUpdate(productId).orElseThrow(CatalogReferenceService::notFound);
        if (product.isDeleted()) throw notFound();
        return product;
    }

    public Product publicProduct(Long productId) {
        Product product = product(productId);
        if (!"ACTIVE".equals(product.getStatus())) throw notFound();
        return product;
    }

    public Category category(Long categoryId) {
        return categories.findById(categoryId).orElseThrow(CatalogReferenceService::notFound);
    }

    @Transactional
    public Category categoryForUpdate(Long categoryId) {
        return categories.findByIdForUpdate(categoryId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public Set<Long> categoryIdsIncludingDescendants(Long categoryId) {
        category(categoryId);
        Map<Long, List<Long>> children = new HashMap<>();
        for (Category category : categories.findAllByOrderByCategoryIdAsc()) {
            if (category.getParentCategoryId() != null) {
                children.computeIfAbsent(
                                category.getParentCategoryId(), ignored -> new ArrayList<>())
                        .add(category.getCategoryId());
            }
        }

        Set<Long> result = new HashSet<>();
        Set<Long> visited = new HashSet<>();
        var pending = new ArrayDeque<Long>();
        pending.add(categoryId);
        while (!pending.isEmpty()) {
            Long id = pending.removeFirst();
            if (!visited.add(id)) continue;
            result.add(id);
            pending.addAll(children.getOrDefault(id, List.of()));
        }
        return Set.copyOf(result);
    }

    public Brand brand(Long brandId) {
        return brands.findById(brandId).orElseThrow(CatalogReferenceService::notFound);
    }

    public Category leafCategory(Long categoryId) {
        Category category = category(categoryId);
        if (categories.existsByParentCategoryId(categoryId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Products must use a leaf category");
        }
        return category;
    }

    public Map<Long, Product> productsById(Collection<Long> productIds) {
        var requestedIds = distinctIds(productIds);
        if (requestedIds.isEmpty()) return Map.of();
        return requireAll(
                requestedIds,
                products.findAllByProductIdIn(requestedIds),
                Product::getProductId);
    }

    private List<Long> distinctIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        return ids.stream().filter(java.util.Objects::nonNull).distinct().toList();
    }

    private <T> Map<Long, T> requireAll(
            Collection<Long> requestedIds, Collection<T> values, Function<T, Long> id) {
        Map<Long, T> byId = values.stream().collect(Collectors.toMap(id, Function.identity()));
        for (Long requestedId : requestedIds) {
            if (!byId.containsKey(requestedId)) throw notFound();
        }
        return Map.copyOf(byId);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
