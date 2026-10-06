package com.fido.modules.product.service;

import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.SizeSystem;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.SizeSystemRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Centralized catalog reference lookup and invariant checks shared by
 * catalog command/query services.
 */
@Service
@Transactional(readOnly = true)
public class CatalogReferenceService {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ColorRepository colors;

    public CatalogReferenceService(
            ProductRepository products,
            CategoryRepository categories,
            BrandRepository brands,
            SizeSystemRepository sizeSystems,
            SizeValueRepository sizeValues,
            ColorRepository colors
    ) {
        this.products = products;
        this.categories = categories;
        this.brands = brands;
        this.sizeSystems = sizeSystems;
        this.sizeValues = sizeValues;
        this.colors = colors;
    }

    public Product product(Long productId) {
        return products.findById(productId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    @Transactional
    public Product productForUpdate(Long productId) {
        return products.findByIdForUpdate(productId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public Category category(Long categoryId) {
        return categories.findById(categoryId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public Brand brand(Long brandId) {
        return brands.findById(brandId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public SizeSystem sizeSystem(Long sizeSystemId) {
        return sizeSystems.findById(sizeSystemId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public SizeValue sizeValue(Long sizeValueId) {
        return sizeValues.findById(sizeValueId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public Color color(Long colorId) {
        return colors.findById(colorId)
                .orElseThrow(CatalogReferenceService::notFound);
    }

    public Category leafCategory(Long categoryId) {
        Category category = category(categoryId);

        if (categories.existsByParentCategoryId(categoryId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        return category;
    }
<<<<<<< HEAD
=======

    private java.util.List<Long> distinctIds(
            Collection<Long> ids
    ) {
        if (ids == null || ids.isEmpty()) {
            return java.util.List.of();
        }

        return ids.stream()
                .distinct()
                .toList();
    }

    private <T> Map<Long, T> requireAll(
            Collection<Long> requestedIds,
            Collection<T> values,
            Function<T, Long> id
    ) {
        Map<Long, T> valuesById = values.stream()
                .collect(Collectors.toMap(
                        id,
                        Function.identity()
                ));

        for (Long requestedId : requestedIds) {
            if (!valuesById.containsKey(requestedId)) {
                throw notFound();
            }
        }

        return Map.copyOf(valuesById);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
}
