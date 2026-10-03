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
import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
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
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    public Category category(Long categoryId) {
        return categories.findById(categoryId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    public Brand brand(Long brandId) {
        return brands.findById(brandId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    public SizeSystem sizeSystem(Long sizeSystemId) {
        return sizeSystems.findById(sizeSystemId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    public SizeValue sizeValue(Long sizeValueId) {
        return sizeValues.findById(sizeValueId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    public Map<Long, SizeValue> sizeValuesById(
            Collection<Long> sizeValueIds
    ) {
        var requestedIds = distinctIds(sizeValueIds);

        if (requestedIds.isEmpty()) {
            return Map.of();
        }

        return requireAll(
                requestedIds,
                sizeValues.findAllBySizeValueIdIn(requestedIds),
                SizeValue::getSizeValueId
        );
    }

    public Color color(Long colorId) {
        return colors.findById(colorId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    public Map<Long, Color> colorsById(
            Collection<Long> colorIds
    ) {
        var requestedIds = distinctIds(colorIds);

        if (requestedIds.isEmpty()) {
            return Map.of();
        }

        return requireAll(
                requestedIds,
                colors.findAllByColorIdIn(requestedIds),
                Color::getColorId
        );
    }

    public Category leafCategory(Long categoryId) {
        Category category = category(categoryId);

        if (categories.existsByParentCategoryId(categoryId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        return category;
    }

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
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
        }

        return Map.copyOf(valuesById);
    }
}
