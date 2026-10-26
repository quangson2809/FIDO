package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;

    public PublicCatalogQueryService(
            ProductRepository products,
            ProductImageRepository images,
            ProductImageReadService imageRead,
            CategoryRepository categories,
            BrandRepository brands,
            CatalogReferenceService references,
            CatalogMetaService metaService) {
        this.products = products;
        this.images = images;
        this.imageRead = imageRead;
        this.categories = categories;
        this.brands = brands;
        this.references = references;
        this.metaService = metaService;
    }

    public ApiListResponse<ProductSummaryDto> publicProducts(CatalogProductFilter filter) {
        validatePriceRange(filter);
        Pagination pagination = Pagination.of(filter.page(), filter.pageSize());
        Specification<Product> spec =
                CatalogSpecifications.publicProducts(
                        filter,
                        filter.categoryId() == null
                                ? List.of()
                                : references.categoryIdsIncludingDescendants(filter.categoryId()));
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
        Category category =
                product.getCategoryId() == null ? null : references.category(product.getCategoryId());
        Brand brand = product.getBrandId() == null ? null : references.brand(product.getBrandId());
        var productImages =
                images.findAllByProductIdOrderBySortOrderAsc(productId).stream()
                        .map(CatalogMapper::image)
                        .toList();
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
                product.getUpdatedAt());
    }

    public CatalogMetaDto publicMeta() {
        return metaService.publicMeta();
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
