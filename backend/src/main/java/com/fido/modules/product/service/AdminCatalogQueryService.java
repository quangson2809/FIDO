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
import java.util.Map;
import java.util.ArrayList;
import java.util.stream.Collectors;

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

        Product parentProduct = product.getParentProductId() == null
                ? null : references.product(product.getParentProductId());
        List<Product> childProducts = products.findAllByParentProductIdOrderByProductIdAsc(productId).stream()
                .filter(child -> !child.isDeleted()).toList();
        List<Product> related = new ArrayList<>();
        related.add(product);
        if (parentProduct != null) related.add(parentProduct);
        related.addAll(childProducts);
        List<Long> ids = related.stream().map(Product::getProductId).distinct().toList();

        var categories = references.categoriesById(related.stream().map(Product::getCategoryId).toList());
        var brands = references.brandsById(related.stream().map(Product::getBrandId).toList());
        Map<Long, List<ProductImageDto>> galleries = images
                .findAllByProductIdInOrderByProductIdAscSortOrderAscImageIdAsc(ids).stream()
                .collect(Collectors.groupingBy(com.fido.modules.product.entity.ProductImage::getProductId,
                        Collectors.mapping(CatalogMapper::image, Collectors.toList())));
        var values = attributeValueRead.forProducts(ids);
        Map<Long, AdminProductRelationDto> relations = related.stream().collect(Collectors.toMap(
                Product::getProductId,
                item -> relation(item,
                        item.getCategoryId() == null ? null : CatalogMapper.category(categories.get(item.getCategoryId())),
                        item.getBrandId() == null ? null : CatalogMapper.brand(brands.get(item.getBrandId())),
                        galleries.getOrDefault(item.getProductId(), List.of()),
                        values.getOrDefault(item.getProductId(), List.of())),
                (first, ignored) -> first));
        AdminProductRelationDto current = relations.get(productId);
        AdminProductRelationDto parent = parentProduct == null ? null : relations.get(parentProduct.getProductId());
        List<AdminProductRelationDto> children = childProducts.stream()
                .map(child -> relations.get(child.getProductId())).toList();

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

    private AdminProductRelationDto relation(
            Product product, CategoryDto category, BrandDto brand,
            List<ProductImageDto> productImages, List<ProductAttributeValueDto> values) {
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
