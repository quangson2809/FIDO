package com.fido.modules.product.service.query;

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

/** Ghép chi tiết và các Product cùng family để chọn mua; mỗi Product có SKU, ảnh và tồn kho riêng. */
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

    /**
     * productId từ URL có thể là cha hoặc con; đọc family ACTIVE để giao diện chọn đúng tổ hợp.
     * Mỗi thành viên dùng giá, ảnh, thuộc tính và tồn theo ID riêng, không kế thừa ngầm từ cha.
     */
    public ProductDetailDto detail(Long productId) {
        Product requested = references.publicProduct(productId);
        // Nếu đang mở Product con thì dùng parent_product_id làm gốc để tải cả các tổ hợp cùng
        // nhóm.
        Long rootId =
                requested.getParentProductId() == null
                        ? requested.getProductId()
                        : requested.getParentProductId();
        var visibility = references.visibility();
        List<Product> family =
                activeFamily(requested, rootId).stream().filter(visibility::allows).toList();
        List<Long> ids = family.stream().map(Product::getProductId).toList();

        // Đọc ảnh, thuộc tính và tồn kho theo lô cho cả family để tránh truy vấn từng Product.
        Map<Long, List<ProductImageDto>> galleries = imageGalleries(ids);
        Map<Long, List<ProductAttributeValueDto>> attributes = attributeValueRead.forProducts(ids);
        Map<Long, Integer> stock = inventory.availableQuantities(ids);

        List<ProductFamilyMemberDto> members =
                family.stream()
                        .map(
                                product -> {
                                    int available = stock.getOrDefault(product.getProductId(), 0);
                                    return new ProductFamilyMemberDto(
                                            product.getProductId(),
                                            product.getParentProductId(),
                                            product.getSku(),
                                            product.getName(),
                                            product.getSellingPrice(),
                                            product.getStatus(),
                                            List.copyOf(galleries.get(product.getProductId())),
                                            attributes.getOrDefault(
                                                    product.getProductId(), List.of()),
                                            available,
                                            isPublic(product) && available > 0);
                                })
                        .toList();

        Category category =
                requested.getCategoryId() == null
                        ? null
                        : references.category(requested.getCategoryId());
        Brand brand =
                requested.getBrandId() == null ? null : references.brand(requested.getBrandId());
        return new ProductDetailDto(
                requested.getProductId(),
                requested.getParentProductId(),
                requested.getSku(),
                requested.getName(),
                requested.getSlug(),
                requested.getDescription(),
                category == null ? null : CatalogMapper.category(category),
                CatalogMapper.brand(brand),
                requested.getSellingPrice(),
                requested.getStatus(),
                List.copyOf(galleries.get(productId)),
                requested.getCreatedAt(),
                requested.getUpdatedAt(),
                attributes.getOrDefault(productId, List.of()),
                new ProductFamilyDto(rootId, members));
    }

    private List<Product> activeFamily(Product requested, Long rootId) {
        List<Product> members = new ArrayList<>();
        if (rootId.equals(requested.getProductId())) {
            members.add(requested);
        } else {
            // Cha có thể bị ẩn trong khi Product con được truy cập trực tiếp vẫn ACTIVE.
            products.findById(rootId)
                    .filter(PublicCatalogFamilyReadService::isPublic)
                    .ifPresent(members::add);
        }
        products.findAllByParentProductIdOrderByProductIdAsc(rootId).stream()
                .filter(PublicCatalogFamilyReadService::isPublic)
                .forEach(members::add);
        if (members.stream()
                .noneMatch(product -> product.getProductId().equals(requested.getProductId()))) {
            members.add(requested);
        }
        members.sort(
                Comparator.comparing((Product product) -> !product.getProductId().equals(rootId))
                        .thenComparing(Product::getProductId));
        return members;
    }

    private Map<Long, List<ProductImageDto>> imageGalleries(List<Long> ids) {
        Map<Long, List<ProductImageDto>> galleries = new LinkedHashMap<>();
        ids.forEach(id -> galleries.put(id, new ArrayList<>()));
        images.findAllByProductIdInOrderByProductIdAscSortOrderAscImageIdAsc(ids)
                .forEach(
                        image ->
                                galleries
                                        .get(image.getProductId())
                                        .add(CatalogMapper.image(image)));
        return galleries;
    }

    private static boolean isPublic(Product product) {
        return !product.isDeleted() && "ACTIVE".equals(product.getStatus());
    }
}
