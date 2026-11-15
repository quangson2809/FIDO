package com.fido.modules.product.service;

import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.dto.response.ProductAttributeValueDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductFamilyDto;
import com.fido.modules.product.dto.response.ProductFamilyMemberDto;
import com.fido.modules.product.dto.response.ProductImageDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Assembles the Product-detail view and its SELECTABLE family.
 *
 * <p>Unlike list/search, this read intentionally expands direct children. It
 * does not infer a child's stock from its parent: every Product ID is its own
 * purchasable SKU with its own image gallery and inventory balance.
 */
@Service
@Transactional(readOnly = true)
public class PublicCatalogFamilyReadService {
    private final ProductRepository products;
    private final InventoryAvailabilityService inventory;
    private final ProductImageRepository images;
    private final ProductAttributeValueReadService attributeValueRead;
    private final CatalogReferenceService references;

    public PublicCatalogFamilyReadService(
            ProductRepository products,
            InventoryAvailabilityService inventory,
            ProductImageRepository images,
            ProductAttributeValueReadService attributeValueRead,
            CatalogReferenceService references) {
        this.products = products;
        this.inventory = inventory;
        this.images = images;
        this.attributeValueRead = attributeValueRead;
        this.references = references;
    }

    public ProductDetailDto detail(Long productId) {
        Product requested = references.publicProduct(productId);
        Long rootId = requested.getParentProductId() == null
                ? requested.getProductId() : requested.getParentProductId();
        List<Product> family = activeFamily(requested, rootId);
        List<Long> ids = family.stream().map(Product::getProductId).toList();

        // Load all family images/attributes/stock in batches, avoiding N+1 reads.
        Map<Long, List<ProductImageDto>> galleries = imageGalleries(ids);
        Map<Long, List<ProductAttributeValueDto>> attributes = attributeValueRead.forProducts(ids);
        Map<Long, Integer> stock = inventory.availableQuantities(ids);

        List<ProductFamilyMemberDto> members = family.stream().map(product -> {
            int available = stock.getOrDefault(product.getProductId(), 0);
            return new ProductFamilyMemberDto(
                    product.getProductId(), product.getParentProductId(),
                    product.getSku(), product.getName(), product.getSellingPrice(),
                    product.getStatus(),
                    List.copyOf(galleries.get(product.getProductId())),
                    attributes.getOrDefault(product.getProductId(), List.of()),
                    available, isPublic(product) && available > 0);
        }).toList();

        Category category = requested.getCategoryId() == null
                ? null : references.category(requested.getCategoryId());
        Brand brand = requested.getBrandId() == null
                ? null : references.brand(requested.getBrandId());
        return new ProductDetailDto(
                requested.getProductId(), requested.getParentProductId(),
                requested.getSku(), requested.getName(), requested.getSlug(),
                requested.getDescription(),
                category == null ? null : CatalogMapper.category(category),
                CatalogMapper.brand(brand), requested.getSellingPrice(),
                requested.getStatus(),
                List.copyOf(galleries.get(productId)),
                requested.getCreatedAt(), requested.getUpdatedAt(),
                attributes.getOrDefault(productId, List.of()),
                new ProductFamilyDto(rootId, members));
    }

    private List<Product> activeFamily(Product requested, Long rootId) {
        List<Product> members = new ArrayList<>();
        if (rootId.equals(requested.getProductId())) {
            members.add(requested);
        } else {
            // Parent may be inactive while a directly requested child is still public.
            products.findById(rootId).filter(PublicCatalogFamilyReadService::isPublic)
                    .ifPresent(members::add);
        }
        products.findAllByParentProductIdOrderByProductIdAsc(rootId).stream()
                .filter(PublicCatalogFamilyReadService::isPublic)
                .forEach(members::add);
        if (members.stream().noneMatch(product -> product.getProductId().equals(requested.getProductId()))) {
            members.add(requested);
        }
        members.sort(Comparator
                .comparing((Product product) -> !product.getProductId().equals(rootId))
                .thenComparing(Product::getProductId));
        return members;
    }

    private Map<Long, List<ProductImageDto>> imageGalleries(List<Long> ids) {
        Map<Long, List<ProductImageDto>> galleries = new LinkedHashMap<>();
        ids.forEach(id -> galleries.put(id, new ArrayList<>()));
        images.findAllByProductIdInOrderByProductIdAscSortOrderAscImageIdAsc(ids)
                .forEach(image -> galleries.get(image.getProductId())
                        .add(CatalogMapper.image(image)));
        return galleries;
    }

    private static boolean isPublic(Product product) {
        return !product.isDeleted() && "ACTIVE".equals(product.getStatus());
    }
}
