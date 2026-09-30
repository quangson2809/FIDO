package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.dto.response.ProductVariantDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class PublicCatalogQueryService {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final InventoryAvailabilityService inventory;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;

    public PublicCatalogQueryService(
            ProductRepository products,
            ProductVariantRepository variants,
            ProductImageRepository images,
            CategoryRepository categories,
            BrandRepository brands,
            InventoryAvailabilityService inventory,
            CatalogReferenceService references,
            CatalogMetaService metaService
    ) {
        this.products = products;
        this.variants = variants;
        this.images = images;
        this.categories = categories;
        this.brands = brands;
        this.inventory = inventory;
        this.references = references;
        this.metaService = metaService;
    }

    public ApiListResponse<ProductSummaryDto> publicProducts(
            CatalogProductFilter filter
    ) {
        validatePriceRange(filter);

        Pagination pagination = Pagination.of(
                filter.page(),
                filter.pageSize()
        );

        Specification<Product> specification =
                CatalogSpecifications.publicProducts(filter);

        var result = products.findAll(
                specification,
                pagination.toPageable()
        );

        Map<Long, Category> categoriesById = categoryMap();
        Map<Long, Brand> brandsById = brandMap();

        var data = result.getContent()
                .stream()
                .map(product -> new ProductSummaryDto(
                        product.getProductId(),
                        product.getName(),
                        CatalogMapper.category(
                                requiredCategory(
                                        categoriesById,
                                        product.getCategoryId()
                                )
                        ),
                        product.getBrandId() == null
                                ? null
                                : CatalogMapper.brand(
                                        requiredBrand(
                                                brandsById,
                                                product.getBrandId()
                                        )
                                ),
                        product.getBasePrice(),
                        product.getSaleStatus()
                ))
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    public ProductDetailDto publicDetail(Long productId) {
        return detailInternal(
                references.product(productId)
        );
    }

    public CatalogMetaDto publicMeta() {
        return metaService.meta();
    }

    private ProductDetailDto detailInternal(Product product) {
        var productVariants =
                variants.findAllByProductIdOrderByVariantIdAsc(
                        product.getProductId()
                );

        var availabilityByVariantId = inventory.availableQuantities(
                productVariants.stream()
                        .map(ProductVariant::getVariantId)
                        .toList()
        );

        var publicVariants = productVariants.stream()
                .map(variant -> {
                    SizeValue size = references.sizeValue(
                            variant.getSizeValueId()
                    );

                    Color color = references.color(
                            variant.getColorId()
                    );

                    BigDecimal effectivePrice =
                            variant.getOverridePrice() == null
                                    ? product.getBasePrice()
                                    : variant.getOverridePrice();

                    return new ProductVariantDto(
                            variant.getVariantId(),
                            CatalogMapper.sizeValue(size),
                            CatalogMapper.color(color),
                            variant.getSku(),
                            effectivePrice,
                            variant.getSaleStatus(),
                            availabilityByVariantId.getOrDefault(
                                    variant.getVariantId(),
                                    0
                            )
                    );
                })
                .toList();

        var productImages = images
                .findAllByProductIdOrderByImageIdAsc(
                        product.getProductId()
                )
                .stream()
                .map(CatalogMapper::image)
                .toList();

        return new ProductDetailDto(
                product.getProductId(),
                product.getName(),
                product.getDescription(),
                CatalogMapper.category(
                        references.category(product.getCategoryId())
                ),
                brandDto(product.getBrandId()),
                metaService.sizeSystemDto(product.getSizeSystemId()),
                product.getGender(),
                product.getSeason(),
                product.getStyle(),
                product.getMaterialCare(),
                product.getBasePrice(),
                product.getSaleStatus(),
                productImages,
                publicVariants
        );
    }

    private BrandDto brandDto(Long brandId) {
        if (brandId == null) {
            return null;
        }

        return CatalogMapper.brand(
                references.brand(brandId)
        );
    }

    private void validatePriceRange(
            CatalogProductFilter filter
    ) {
        BigDecimal minPrice = filter.minPrice();
        BigDecimal maxPrice = filter.maxPrice();

        boolean invalidMin =
                minPrice != null && minPrice.signum() < 0;

        boolean invalidMax =
                maxPrice != null && maxPrice.signum() < 0;

        boolean invalidRange =
                minPrice != null
                && maxPrice != null
                && minPrice.compareTo(maxPrice) > 0;

        if (invalidMin || invalidMax || invalidRange) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    private Map<Long, Category> categoryMap() {
        var result = new HashMap<Long, Category>();

        categories.findAllByOrderByCategoryIdAsc()
                .forEach(category ->
                        result.put(
                                category.getCategoryId(),
                                category
                        )
                );

        return result;
    }

    private Map<Long, Brand> brandMap() {
        var result = new HashMap<Long, Brand>();

        brands.findAllByOrderByBrandIdAsc()
                .forEach(brand ->
                        result.put(
                                brand.getBrandId(),
                                brand
                        )
                );

        return result;
    }

    private Category requiredCategory(
            Map<Long, Category> map,
            Long categoryId
    ) {
        Category category = map.get(categoryId);

        if (category == null) {
            throw new IllegalStateException("Missing category");
        }

        return category;
    }

    private Brand requiredBrand(
            Map<Long, Brand> map,
            Long brandId
    ) {
        Brand brand = map.get(brandId);

        if (brand == null) {
            throw new IllegalStateException("Missing brand");
        }

        return brand;
    }
}
