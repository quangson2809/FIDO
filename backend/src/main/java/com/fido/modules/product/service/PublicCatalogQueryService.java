package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Public Catalog list/search API orchestration.
 *
 * <p>The collection query pages ROOT Product rows in SQL; it must never load
 * every child and then deduplicate after pagination. Detail/family expansion
 * belongs to PublicCatalogFamilyReadService.
 */
@Service
@Transactional(readOnly = true)
public class PublicCatalogQueryService {
    private final ProductRepository products;
    private final ProductImageReadService imageRead;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;
    private final PublicCatalogFamilyReadService familyReader;

    public PublicCatalogQueryService(
            ProductRepository products,
            ProductImageReadService imageRead,
            CategoryRepository categories,
            BrandRepository brands,
            CatalogReferenceService references,
            CatalogMetaService metaService,
            AttributeRepository attributes,
            AttributeOptionRepository options,
            PublicCatalogFamilyReadService familyReader) {
        this.products = products;
        this.imageRead = imageRead;
        this.categories = categories;
        this.brands = brands;
        this.references = references;
        this.metaService = metaService;
        this.attributes = attributes;
        this.options = options;
        this.familyReader = familyReader;
    }

    public ApiListResponse<ProductSummaryDto> publicProducts(CatalogProductFilter filter) {
        validatePriceRange(filter);
        Map<Long, Long> selectedOptions = resolveAttributeFilters(filter.attributeFilters());
        Pagination pagination = Pagination.of(filter.page(), filter.pageSize());
        Specification<Product> specification = CatalogSpecifications.publicProducts(
                filter,
                filter.categoryId() == null
                        ? List.of()
                        : references.categoryIdsIncludingDescendants(filter.categoryId()),
                selectedOptions);
        var page = products.findAll(specification, pagination.toPageable());
        List<Product> roots = page.getContent();
        List<Long> ids = roots.stream().map(Product::getProductId).toList();

        // Batch only the fields required for this page of root summaries.
        Map<Long, Category> categoriesById = categoryMap(roots);
        Map<Long, Brand> brandsById = brandMap(roots);
        Map<Long, String> thumbnails = imageRead.representativeByProductIds(ids);
        List<ProductSummaryDto> data = roots.stream()
                .map(product -> CatalogMapper.publicSummary(
                        product,
                        thumbnails.get(product.getProductId()),
                        product.getCategoryId() == null
                                ? null : categoriesById.get(product.getCategoryId()),
                        product.getBrandId() == null
                                ? null : brandsById.get(product.getBrandId())))
                .toList();
        return ApiListResponse.of(data, pagination.meta(page.getTotalElements()));
    }

    /** Preserves the existing controller-facing contract; only delegation changes. */
    public ProductDetailDto publicDetail(Long productId) {
        return familyReader.detail(productId);
    }

    public CatalogMetaDto publicMeta() {
        return metaService.publicMeta();
    }

    private Map<Long, Long> resolveAttributeFilters(Map<String, String> filters) {
        Map<Long, Long> selected = new LinkedHashMap<>();
        for (var filter : filters.entrySet()) {
            Attribute attribute = attributes.findByCode(filter.getKey())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Unknown Attribute filter code"));
            AttributeOption option = options.findByAttributeIdAndValue(
                            attribute.getAttributeId(), filter.getValue())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Unknown Option for Attribute filter"));
            selected.put(attribute.getAttributeId(), option.getAttributeOptionId());
        }
        return selected;
    }

    private void validatePriceRange(CatalogProductFilter filter) {
        Long min = filter.minPrice();
        Long max = filter.maxPrice();
        if ((min != null && min < 0) || (max != null && max < 0)
                || (min != null && max != null && min > max)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid price range");
        }
    }

    private Map<Long, Category> categoryMap(List<Product> roots) {
        var ids = roots.stream().map(Product::getCategoryId)
                .filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return categories.findAllByCategoryIdIn(ids).stream()
                .collect(Collectors.toMap(Category::getCategoryId, Function.identity()));
    }

    private Map<Long, Brand> brandMap(List<Product> roots) {
        var ids = roots.stream().map(Product::getBrandId)
                .filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return brands.findAllByBrandIdIn(ids).stream()
                .collect(Collectors.toMap(Brand::getBrandId, Function.identity()));
    }
}
