package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.dto.response.ProductVariantDto;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeSystem;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import com.fido.modules.product.repository.SizeSystemRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CatalogQueryService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_READ')";

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;

    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ColorRepository colors;

    private final InventoryAvailabilityService inventory;

    public CatalogQueryService(
            ProductRepository products,
            ProductVariantRepository variants,
            ProductImageRepository images,
            CategoryRepository categories,
            BrandRepository brands,
            SizeSystemRepository sizeSystems,
            SizeValueRepository sizeValues,
            ColorRepository colors,
            InventoryAvailabilityService inventory
    ) {
        this.products = products;
        this.variants = variants;
        this.images = images;

        this.categories = categories;
        this.brands = brands;
        this.sizeSystems = sizeSystems;
        this.sizeValues = sizeValues;
        this.colors = colors;

        this.inventory = inventory;
    }

    public ApiListResponse<ProductSummaryDto> publicProducts(
            String q,
            Long categoryId,
            Long brandId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Long sizeValueId,
            Long colorId,
            String gender,
            String season,
            String style,
            Integer page,
            Integer pageSize
    ) {
        validatePriceRange(
                minPrice,
                maxPrice
        );

        Pagination pagination = pagination(
                page,
                pageSize
        );

        Specification<Product> specification = publicSpec(
                q,
                categoryId,
                brandId,
                minPrice,
                maxPrice,
                sizeValueId,
                colorId,
                gender,
                season,
                style
        );

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
        return publicDetailInternal(
                product(productId)
        );
    }

    public CatalogMetaDto publicMeta() {
        return metaInternal();
    }

    @PreAuthorize(READ)
    public ApiListResponse<AdminProductSummaryDto> adminProducts(
            String q,
            Long categoryId,
            Long brandId,
            Long sizeSystemId,
            String saleStatus,
            Integer page,
            Integer pageSize
    ) {
        if (saleStatus != null) {
            CatalogPolicy.requireSaleStatus(saleStatus);
        }

        Pagination pagination = pagination(
                page,
                pageSize
        );

        Specification<Product> specification = adminSpec(
                q,
                categoryId,
                brandId,
                sizeSystemId,
                saleStatus
        );

        var result = products.findAll(
                specification,
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(CatalogMapper::adminSummary)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    @PreAuthorize(READ)
    public AdminProductDetailDto adminDetail(Long productId) {
        return adminDetailInternal(productId);
    }

    @PreAuthorize(READ)
    public CatalogMetaDto adminMeta() {
        return metaInternal();
    }

    AdminProductDetailDto adminDetailInternal(Long productId) {
        Product product = product(productId);

        var productVariants =
                variants.findAllByProductIdOrderByVariantIdAsc(productId);

        var availabilityByVariantId = inventory.availableQuantities(
                productVariants.stream()
                        .map(ProductVariant::getVariantId)
                        .toList()
        );

        var adminVariants = productVariants.stream()
                .map(variant -> new AdminVariantDto(
                        variant.getVariantId(),
                        variant.getProductId(),
                        variant.getSizeValueId(),
                        variant.getColorId(),
                        variant.getSku(),
                        variant.getOverridePrice(),
                        variant.getSaleStatus(),
                        availabilityByVariantId.getOrDefault(
                                variant.getVariantId(),
                                0
                        ),
                        variant.getCreatedAt(),
                        variant.getUpdatedAt()
                ))
                .toList();

        var productImages = images
                .findAllByProductIdOrderByImageIdAsc(productId)
                .stream()
                .map(CatalogMapper::image)
                .toList();

        return new AdminProductDetailDto(
                product.getProductId(),
                product.getName(),
                product.getDescription(),
                CatalogMapper.category(
                        category(product.getCategoryId())
                ),
                brandDto(product.getBrandId()),
                sizeSystemDtoInternal(product.getSizeSystemId()),
                product.getGender(),
                product.getSeason(),
                product.getStyle(),
                product.getMaterialCare(),
                product.getBasePrice(),
                product.getSaleStatus(),
                productImages,
                adminVariants,
                product.getCategoryId(),
                product.getBrandId(),
                product.getSizeSystemId(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }

    java.util.List<AdminVariantDto> adminVariantsInternal(Long productId) {
        product(productId);

        var productVariants =
                variants.findAllByProductIdOrderByVariantIdAsc(productId);

        var availabilityByVariantId = inventory.availableQuantities(
                productVariants.stream()
                        .map(ProductVariant::getVariantId)
                        .toList()
        );

        return productVariants.stream()
                .map(variant -> new AdminVariantDto(
                        variant.getVariantId(),
                        variant.getProductId(),
                        variant.getSizeValueId(),
                        variant.getColorId(),
                        variant.getSku(),
                        variant.getOverridePrice(),
                        variant.getSaleStatus(),
                        availabilityByVariantId.getOrDefault(
                                variant.getVariantId(),
                                0
                        ),
                        variant.getCreatedAt(),
                        variant.getUpdatedAt()
                ))
                .toList();
    }

    AdminVariantDto adminVariantInternal(
            Long productId,
            Long variantId
    ) {
        ProductVariant variant = variants
                .findByVariantIdAndProductId(
                        variantId,
                        productId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );

        return new AdminVariantDto(
                variant.getVariantId(),
                variant.getProductId(),
                variant.getSizeValueId(),
                variant.getColorId(),
                variant.getSku(),
                variant.getOverridePrice(),
                variant.getSaleStatus(),
                inventory.availableQuantity(variant.getVariantId()),
                variant.getCreatedAt(),
                variant.getUpdatedAt()
        );
    }

    SizeSystemDto sizeSystemDtoInternal(Long sizeSystemId) {
        SizeSystem sizeSystem = sizeSystem(sizeSystemId);

        var values = sizeValues
                .findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(
                        sizeSystemId
                )
                .stream()
                .map(CatalogMapper::sizeValue)
                .toList();

        return CatalogMapper.sizeSystem(
                sizeSystem,
                values
        );
    }

    CatalogMetaDto metaInternal() {
        var categoryDtos = categories
                .findAllByOrderByCategoryIdAsc()
                .stream()
                .map(CatalogMapper::category)
                .toList();

        var brandDtos = brands
                .findAllByOrderByBrandIdAsc()
                .stream()
                .map(CatalogMapper::brand)
                .toList();

        var sizeSystemDtos = sizeSystems
                .findAllByOrderBySizeSystemIdAsc()
                .stream()
                .map(sizeSystem ->
                        sizeSystemDtoInternal(sizeSystem.getSizeSystemId())
                )
                .toList();

        var colorDtos = colors
                .findAllByOrderByColorIdAsc()
                .stream()
                .map(CatalogMapper::color)
                .toList();

        return new CatalogMetaDto(
                categoryDtos,
                brandDtos,
                sizeSystemDtos,
                colorDtos,
                products.findDistinctGenders(),
                products.findDistinctSeasons(),
                products.findDistinctStyles()
        );
    }

    private ProductDetailDto publicDetailInternal(Product product) {
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
                    SizeValue size = sizeValue(
                            variant.getSizeValueId()
                    );

                    Color color = color(
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
                        category(product.getCategoryId())
                ),
                brandDto(product.getBrandId()),
                sizeSystemDtoInternal(product.getSizeSystemId()),
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

    private Specification<Product> adminSpec(
            String q,
            Long categoryId,
            Long brandId,
            Long sizeSystemId,
            String saleStatus
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (q != null && !q.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("name")),
                                "%" + q.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (categoryId != null) {
                predicates.add(
                        cb.equal(root.get("categoryId"), categoryId)
                );
            }

            if (brandId != null) {
                predicates.add(
                        cb.equal(root.get("brandId"), brandId)
                );
            }

            if (sizeSystemId != null) {
                predicates.add(
                        cb.equal(root.get("sizeSystemId"), sizeSystemId)
                );
            }

            if (saleStatus != null) {
                predicates.add(
                        cb.equal(root.get("saleStatus"), saleStatus)
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    private Specification<Product> publicSpec(
            String q,
            Long categoryId,
            Long brandId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Long sizeValueId,
            Long colorId,
            String gender,
            String season,
            String style
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            predicates.add(
                    cb.equal(
                            root.get("saleStatus"),
                            CatalogPolicy.ON_SALE
                    )
            );

            if (q != null && !q.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("name")),
                                "%" + q.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (categoryId != null) {
                predicates.add(
                        cb.equal(root.get("categoryId"), categoryId)
                );
            }

            if (brandId != null) {
                predicates.add(
                        cb.equal(root.get("brandId"), brandId)
                );
            }

            if (gender != null && !gender.isBlank()) {
                predicates.add(
                        cb.equal(root.get("gender"), gender)
                );
            }

            if (season != null && !season.isBlank()) {
                predicates.add(
                        cb.equal(root.get("season"), season)
                );
            }

            if (style != null && !style.isBlank()) {
                predicates.add(
                        cb.equal(root.get("style"), style)
                );
            }

            Subquery<Long> variantQuery =
                    query.subquery(Long.class);

            var variant = variantQuery.from(ProductVariant.class);
            var variantPredicates = new ArrayList<Predicate>();

            variantPredicates.add(
                    cb.equal(
                            variant.get("productId"),
                            root.get("productId")
                    )
            );

            variantPredicates.add(
                    cb.equal(
                            variant.get("saleStatus"),
                            CatalogPolicy.ON_SALE
                    )
            );

            if (sizeValueId != null) {
                variantPredicates.add(
                        cb.equal(
                                variant.get("sizeValueId"),
                                sizeValueId
                        )
                );
            }

            if (colorId != null) {
                variantPredicates.add(
                        cb.equal(
                                variant.get("colorId"),
                                colorId
                        )
                );
            }

            if (minPrice != null) {
                variantPredicates.add(
                        cb.or(
                                cb.and(
                                        cb.isNotNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.greaterThanOrEqualTo(
                                                variant.<BigDecimal>get(
                                                        "overridePrice"
                                                ),
                                                minPrice
                                        )
                                ),
                                cb.and(
                                        cb.isNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.greaterThanOrEqualTo(
                                                root.<BigDecimal>get(
                                                        "basePrice"
                                                ),
                                                minPrice
                                        )
                                )
                        )
                );
            }

            if (maxPrice != null) {
                variantPredicates.add(
                        cb.or(
                                cb.and(
                                        cb.isNotNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.lessThanOrEqualTo(
                                                variant.<BigDecimal>get(
                                                        "overridePrice"
                                                ),
                                                maxPrice
                                        )
                                ),
                                cb.and(
                                        cb.isNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.lessThanOrEqualTo(
                                                root.<BigDecimal>get(
                                                        "basePrice"
                                                ),
                                                maxPrice
                                        )
                                )
                        )
                );
            }

            variantQuery
                    .select(variant.<Long>get("variantId"))
                    .where(
                            variantPredicates.toArray(Predicate[]::new)
                    );

            predicates.add(
                    cb.exists(variantQuery)
            );

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    private void validatePriceRange(
            BigDecimal minPrice,
            BigDecimal maxPrice
    ) {
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

    private Pagination pagination(
            Integer page,
            Integer pageSize
    ) {
        try {
            return Pagination.of(
                    page,
                    pageSize
            );
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    private Product product(Long productId) {
        return products.findById(productId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Category category(Long categoryId) {
        return categories.findById(categoryId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Brand brand(Long brandId) {
        return brands.findById(brandId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private SizeSystem sizeSystem(Long sizeSystemId) {
        return sizeSystems.findById(sizeSystemId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private SizeValue sizeValue(Long sizeValueId) {
        return sizeValues.findById(sizeValueId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Color color(Long colorId) {
        return colors.findById(colorId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private BrandDto brandDto(Long brandId) {
        if (brandId == null) {
            return null;
        }

        return CatalogMapper.brand(
                brand(brandId)
        );
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
