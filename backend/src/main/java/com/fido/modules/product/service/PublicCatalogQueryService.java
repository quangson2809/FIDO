package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductFamilyDto;
import com.fido.modules.product.dto.response.ProductFamilyMemberDto;
import com.fido.modules.product.dto.response.ProductImageDto;
import com.fido.modules.product.dto.response.ProductAttributeValueDto;
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
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.http.HttpStatus;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PublicCatalogQueryService {

    private final ProductRepository products;
    private final ProductImageRepository images;
    private final ProductImageReadService imageRead;
    private final ProductAttributeValueReadService attributeValueRead;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;

    public PublicCatalogQueryService(
            ProductRepository products,
            ProductImageRepository images,
            ProductImageReadService imageRead,
            ProductAttributeValueReadService attributeValueRead,
            CategoryRepository categories,
            BrandRepository brands,
            CatalogReferenceService references,
            CatalogMetaService metaService,
            AttributeRepository attributes,
            AttributeOptionRepository options) {
        this.products = products;
        this.images = images;
        this.imageRead = imageRead;
        this.attributeValueRead = attributeValueRead;
        this.categories = categories;
        this.brands = brands;
        this.references = references;
        this.metaService = metaService;
        this.attributes = attributes;
        this.options = options;
    }

    public ApiListResponse<ProductSummaryDto> publicProducts(CatalogProductFilter filter) {
        validatePriceRange(filter);
        Map<Long, Long> selectedOptions = resolveAttributeFilters(filter.attributeFilters());
        Pagination pagination = Pagination.of(filter.page(), filter.pageSize());
        Specification<Product> spec =
                CatalogSpecifications.publicProducts(
                        filter,
                        filter.categoryId() == null
                                ? List.of()
                                : references.categoryIdsIncludingDescendants(filter.categoryId()),
                        selectedOptions);
        var result = products.findAll(spec, pagination.toPageable());
        List<Product> pageProducts = result.getContent();
        var ids = pageProducts.stream().map(Product::getProductId).toList();
        Map<Long, Category> categoriesById = categoryMap(pageProducts);
        Map<Long, Brand> brandsById = brandMap(pageProducts);
        Map<Long, String> thumbnails = imageRead.representativeByProductIds(ids);
        var data =
                pageProducts.stream()
                        .map(
                                p ->
                                        CatalogMapper.publicSummary(
                                                p,
                                                thumbnails.get(p.getProductId()),
                                                p.getCategoryId() == null
                                                        ? null
                                                        : categoriesById.get(p.getCategoryId()),
                                                p.getBrandId() == null
                                                        ? null
                                                        : brandsById.get(p.getBrandId())))
                        .toList();
        return ApiListResponse.of(data, pagination.meta(result.getTotalElements()));
    }

    public ProductDetailDto publicDetail(Long productId) {
        Product product = references.publicProduct(productId);
        Long rootId = product.getParentProductId() == null
                ? product.getProductId() : product.getParentProductId();
        List<Product> familyProducts = new ArrayList<>();
        if (rootId.equals(product.getProductId())) {
            familyProducts.add(product);
        } else {
            products.findById(rootId).filter(PublicCatalogQueryService::isPublic)
                    .ifPresent(familyProducts::add);
        }
        products.findAllByParentProductIdOrderByProductIdAsc(rootId).stream()
                .filter(PublicCatalogQueryService::isPublic)
                .forEach(familyProducts::add);
        // The requested ACTIVE child must appear even if the parent is not public.
        if (familyProducts.stream().noneMatch(row -> row.getProductId().equals(productId))) {
            familyProducts.add(product);
        }
        familyProducts.sort(Comparator.comparing((Product row) -> !row.getProductId().equals(rootId))
                .thenComparing(Product::getProductId));
        List<Long> ids = familyProducts.stream().map(Product::getProductId).toList();
        Map<Long, List<ProductImageDto>> galleries = new LinkedHashMap<>();
        ids.forEach(id -> galleries.put(id, new ArrayList<>()));
        images.findAllByProductIdInOrderByProductIdAscSortOrderAscImageIdAsc(ids)
                .forEach(image -> galleries.get(image.getProductId()).add(CatalogMapper.image(image)));
        Map<Long, List<ProductAttributeValueDto>> familyValues = attributeValueRead.forProducts(ids);
        List<ProductFamilyMemberDto> members = familyProducts.stream().map(row ->
                new ProductFamilyMemberDto(
                        row.getProductId(), row.getParentProductId(), row.getSku(), row.getName(),
                        row.getSellingPrice(), row.getStatus(),
                        List.copyOf(galleries.get(row.getProductId())),
                        familyValues.getOrDefault(row.getProductId(), List.of())))
                .toList();
        Category category =
                product.getCategoryId() == null ? null : references.category(product.getCategoryId());
        Brand brand = product.getBrandId() == null ? null : references.brand(product.getBrandId());
        var productImages = List.copyOf(galleries.get(productId));
        return new ProductDetailDto(
                product.getProductId(),
                product.getParentProductId(),
                product.getSku(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                category == null ? null : CatalogMapper.category(category),
                CatalogMapper.brand(brand),
                product.getSellingPrice(),
                product.getStatus(),
                productImages,
                product.getCreatedAt(),
                product.getUpdatedAt(),
                familyValues.getOrDefault(productId, List.of()),
                new ProductFamilyDto(rootId, members));
    }

    private static boolean isPublic(Product product) {
        return !product.isDeleted() && "ACTIVE".equals(product.getStatus());
    }

    public CatalogMetaDto publicMeta() {
        return metaService.publicMeta();
    }

    private Map<Long, Long> resolveAttributeFilters(Map<String, String> filters) {
        Map<Long, Long> selected = new LinkedHashMap<>();
        for (var entry : filters.entrySet()) {
            Attribute attribute = attributes.findByCode(entry.getKey())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Unknown Attribute filter code"));
            AttributeOption option = options.findByAttributeIdAndValue(
                            attribute.getAttributeId(), entry.getValue())
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

    private Map<Long, Category> categoryMap(List<Product> pageProducts) {
        var ids =
                pageProducts.stream()
                        .map(Product::getCategoryId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();
        if (ids.isEmpty()) return Map.of();
        return categories.findAllByCategoryIdIn(ids).stream()
                .collect(Collectors.toMap(Category::getCategoryId, Function.identity()));
    }

    private Map<Long, Brand> brandMap(List<Product> pageProducts) {
        var ids =
                pageProducts.stream()
                        .map(Product::getBrandId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();
        if (ids.isEmpty()) return Map.of();
        return brands.findAllByBrandIdIn(ids).stream()
                .collect(Collectors.toMap(Brand::getBrandId, Function.identity()));
    }
}
