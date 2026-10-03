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
import java.util.List;
import java.util.Map;
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
    private final ProductImageReadService imageRead;
    private final InventoryAvailabilityService inventory;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;

    public AdminCatalogQueryService(
            ProductRepository products,
            ProductVariantRepository variants,
            ProductImageRepository images,
            ProductImageReadService imageRead,
            InventoryAvailabilityService inventory,
            CatalogReferenceService references,
            CatalogMetaService metaService
    ) {
        this.products = products;
        this.variants = variants;
        this.images = images;
        this.imageRead = imageRead;
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

        Pagination pagination = Pagination.of(page, pageSize);
        Specification<Product> specification = CatalogSpecifications.adminProducts(
                q,
                categoryId,
                brandId,
                sizeSystemId,
                saleStatus
        );
        var result = products.findAll(specification, pagination.toPageable());
        var productsOnPage = result.getContent();
        Map<Long, String> imagesByProductId = imageRead.representativeByProductIds(
                productsOnPage.stream()
                        .map(Product::getProductId)
                        .toList()
        );

        var data = productsOnPage.stream()
                .map(product -> CatalogMapper.adminSummary(
                        product,
                        imagesByProductId.get(product.getProductId())
                ))
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
        var adminVariants = readVariants(productId);
        var productImages = images
                .findAllByProductIdOrderByImageIdAsc(productId)
                .stream()
                .map(CatalogMapper::image)
                .toList();

        return new AdminProductDetailDto(
                product.getProductId(),
                product.getName(),
                product.getDescription(),
                CatalogMapper.category(references.category(product.getCategoryId())),
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

    List<AdminVariantDto> variantsInternal(Long productId) {
        references.product(productId);
        return readVariants(productId);
    }

    private List<AdminVariantDto> readVariants(Long productId) {
        var productVariants = variants.findAllByProductIdOrderByVariantIdAsc(productId);
        var availabilityByVariantId = inventory.availableQuantities(
                productVariants.stream()
                        .map(ProductVariant::getVariantId)
                        .toList()
        );
        return productVariants.stream()
                .map(variant -> CatalogMapper.adminVariant(
                        variant,
                        availabilityByVariantId.getOrDefault(variant.getVariantId(), 0)
                ))
                .toList();
    }

    AdminVariantDto variantInternal(Long productId, Long variantId) {
        ProductVariant variant = variants
                .findByVariantIdAndProductId(variantId, productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return CatalogMapper.adminVariant(
                variant,
                inventory.availableQuantity(variant.getVariantId())
        );
    }

    private BrandDto brandDto(Long brandId) {
        return brandId == null ? null : CatalogMapper.brand(references.brand(brandId));
    }
}
