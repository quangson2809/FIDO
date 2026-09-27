package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class AdminCatalogQueryService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_READ')";

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;
    private final InventoryAvailabilityService inventory;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;

    public AdminCatalogQueryService(
            ProductRepository products,
            ProductVariantRepository variants,
            ProductImageRepository images,
            InventoryAvailabilityService inventory,
            CatalogReferenceService references,
            CatalogMetaService metaService
    ) {
        this.products = products;
        this.variants = variants;
        this.images = images;
        this.inventory = inventory;
        this.references = references;
        this.metaService = metaService;
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

        Pagination pagination = Pagination.of(
                page,
                pageSize
        );

        Specification<Product> specification = CatalogSpecifications.adminProducts(
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
        return detailInternal(productId);
    }

    @PreAuthorize(READ)
    public CatalogMetaDto adminMeta() {
        return metaService.meta();
    }

    AdminProductDetailDto detailInternal(Long productId) {
        Product product = references.product(productId);

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
                adminVariants,
                product.getCategoryId(),
                product.getBrandId(),
                product.getSizeSystemId(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }

    java.util.List<AdminVariantDto> variantsInternal(Long productId) {
        references.product(productId);

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

    AdminVariantDto variantInternal(
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

    private BrandDto brandDto(Long brandId) {
        if (brandId == null) {
            return null;
        }

        return CatalogMapper.brand(
                references.brand(brandId)
        );
    }
}

