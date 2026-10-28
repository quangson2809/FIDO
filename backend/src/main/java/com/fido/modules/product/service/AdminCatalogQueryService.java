package com.fido.modules.product.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminProductRelationDto;
import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ProductAttributeValueDto;
import com.fido.modules.product.dto.response.ProductImageDto;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class AdminCatalogQueryService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_READ')";

    private final ProductRepository products;
    private final ProductImageRepository images;
    private final ProductImageReadService imageRead;
    private final ProductAttributeValueReadService attributeValueRead;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;

    public AdminCatalogQueryService(
            ProductRepository products,
            ProductImageRepository images,
            ProductImageReadService imageRead,
            ProductAttributeValueReadService attributeValueRead,
            CatalogReferenceService references,
            CatalogMetaService metaService) {
        this.products = products;
        this.images = images;
        this.imageRead = imageRead;
        this.attributeValueRead = attributeValueRead;
        this.references = references;
        this.metaService = metaService;
    }

    @PreAuthorize(READ)
    public ApiListResponse<AdminProductSummaryDto> adminProducts(
            String q,
            Long categoryId,
            Long brandId,
            Long parentProductId,
            String status,
            Integer page,
            Integer pageSize) {
        if (status != null) CatalogPolicy.requireProductStatus(status);
        Pagination pagination = Pagination.of(page, pageSize);
        Specification<Product> spec =
                CatalogSpecifications.adminProducts(q, categoryId, brandId, parentProductId, status);
        var result = products.findAll(spec, pagination.toPageable());
        var pageProducts = result.getContent();
        var thumbnails =
                imageRead.representativeByProductIds(
                        pageProducts.stream().map(Product::getProductId).toList());
        var data =
                pageProducts.stream()
                        .map(p -> CatalogMapper.adminSummary(p, thumbnails.get(p.getProductId())))
                        .toList();
        return ApiListResponse.of(data, pagination.meta(result.getTotalElements()));
    }

    @PreAuthorize(READ)
    public AdminProductDetailDto adminDetail(Long productId) {
        return detailInternal(productId);
    }

    @PreAuthorize(READ)
    public AdminCatalogMetaDtoV2 adminMeta() {
        return metaService.adminMeta();
    }

    AdminProductDetailDto detailInternal(Long productId) {
        Product product = references.product(productId);

        AdminProductRelationDto current = relation(product);

        AdminProductRelationDto parent = product.getParentProductId() == null
                ? null
                : relation(references.product(product.getParentProductId()));

        List<AdminProductRelationDto> children =
                products.findAllByParentProductIdOrderByProductIdAsc(productId).stream()
                        .filter(child -> !child.isDeleted())
                        .map(this::relation)
                        .toList();

        return new AdminProductDetailDto(
                current.product_id(),
                current.parent_product_id(),
                children.stream().map(AdminProductRelationDto::product_id).toList(),
                current.sku(),
                current.name(),
                current.slug(),
                current.description(),
                current.category(),
                current.brand(),
                current.category_id(),
                current.brand_id(),
                current.selling_price(),
                current.cost_price(),
                current.status(),
                current.images(),
                current.created_at(),
                current.updated_at(),
                current.attribute_values(),
                parent,
                children);
    }

    private AdminProductRelationDto relation(Product product) {
        CategoryDto category = product.getCategoryId() == null
                ? null
                : CatalogMapper.category(references.category(product.getCategoryId()));

        BrandDto brand = product.getBrandId() == null
                ? null
                : CatalogMapper.brand(references.brand(product.getBrandId()));

        List<ProductImageDto> productImages =
                images.findAllByProductIdOrderBySortOrderAscImageIdAsc(
                                product.getProductId())
                        .stream()
                        .map(CatalogMapper::image)
                        .toList();

        List<ProductAttributeValueDto> values =
                attributeValueRead.forProduct(product.getProductId());

        return new AdminProductRelationDto(
                product.getProductId(),
                product.getParentProductId(),
                product.getSku(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                category,
                brand,
                product.getCategoryId(),
                product.getBrandId(),
                product.getSellingPrice(),
                product.getCostPrice(),
                product.getStatus(),
                values,
                productImages,
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
