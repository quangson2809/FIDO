package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.product.dto.request.ProductAttributeValueInput;
import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.request.ProductImageInput;
import com.fido.modules.product.dto.request.ProductPatchRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.repository.ProductAttributeValueRepository;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;

import jakarta.persistence.EntityManager;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
public class ProductAdminService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ProductRepository products;
    private final ProductImageRepository images;
    private final ProductAttributeValueRepository productAttributeValues;
    private final ProductAttributeValueValidator attributeValueValidator;
    private final CatalogReferenceService references;
    private final AdminCatalogQueryService query;
    private final AuditWriteService audit;
    private final EntityManager em;

    public ProductAdminService(
            ProductRepository products,
            ProductImageRepository images,
            ProductAttributeValueRepository productAttributeValues,
            ProductAttributeValueValidator attributeValueValidator,
            CatalogReferenceService references,
            AdminCatalogQueryService query,
            AuditWriteService audit,
            EntityManager em) {
        this.products = products;
        this.images = images;
        this.productAttributeValues = productAttributeValues;
        this.attributeValueValidator = attributeValueValidator;
        this.references = references;
        this.query = query;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto createProduct(Long actor, ProductCreateRequest request) {
        if (request.category_id() != null) references.category(request.category_id());
        if (request.brand_id() != null) references.brand(request.brand_id());
        validateParent(null, request.parent_product_id());

        String sku = request.sku().trim();
        if (products.existsBySku(sku)) conflict("SKU already exists");
        String status = request.status() == null ? "DRAFT" : request.status();
        CatalogPolicy.requireProductStatus(status);

        Product product = new Product();
        product.setParentProductId(request.parent_product_id());
        product.setCategoryId(request.category_id());
        product.setBrandId(request.brand_id());
        product.setName(trimToNull(request.name()));
        product.setSlug(trimToNull(request.slug()));
        product.setSku(sku);
        product.setDescription(request.description());
        product.setSellingPrice(request.selling_price());
        product.setCostPrice(request.cost_price());
        product.setStatus(status);

        products.save(product);
        flushOrConflict();

        List<ProductAttributeValueInput> requestedValues =
                request.attribute_values() == null
                        ? List.of()
                        : request.attribute_values();
        List<ProductAttributeValue> validatedValues =
                attributeValueValidator.validateCompleteSet(
                        product.getProductId(), status, requestedValues);

        replaceAttributeValues(product.getProductId(), validatedValues);
        flushOrConflict();

        audit.record(AuditWriteEvent.of(
                AuditAction.PRODUCT_CREATE,
                AuditEntityType.PRODUCT,
                product.getProductId().toString()));
        return query.detailInternal(product.getProductId());
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto updateProduct(
            Long actor, Long productId, ProductPatchRequest request) {
        Product product = references.productForUpdate(productId);

        if (request.isParentProductIdPresent()) {
            validateParent(productId, request.getParentProductId());
            product.setParentProductId(request.getParentProductId());
        }
        if (request.isCategoryIdPresent()) {
            if (request.getCategoryId() != null) references.category(request.getCategoryId());
            product.setCategoryId(request.getCategoryId());
        }
        if (request.isBrandIdPresent()) {
            if (request.getBrandId() != null) references.brand(request.getBrandId());
            product.setBrandId(request.getBrandId());
        }
        if (request.isNamePresent()) product.setName(trimToNull(request.getName()));
        if (request.isSlugPresent()) product.setSlug(trimToNull(request.getSlug()));
        if (request.isSkuPresent()) {
            String sku = request.getSku().trim();
            if (products.existsBySkuAndProductIdNot(sku, productId)) {
                conflict("SKU already exists");
            }
            product.setSku(sku);
        }
        if (request.isDescriptionPresent()) product.setDescription(request.getDescription());
        if (request.isSellingPricePresent()) product.setSellingPrice(request.getSellingPrice());
        if (request.isCostPricePresent()) product.setCostPrice(request.getCostPrice());
        if (request.isStatusPresent()) {
            CatalogPolicy.requireProductStatus(request.getStatus());
            product.setStatus(request.getStatus());
        }

        List<ProductAttributeValueInput> resultingInputs =
                request.isAttributeValuesPresent()
                        ? request.getAttributeValues()
                        : productAttributeValues
                                .findAllByProductIdOrderByAttributeIdAsc(productId)
                                .stream()
                                .map(ProductAdminService::toInput)
                                .toList();

        List<ProductAttributeValue> validatedValues =
                attributeValueValidator.validateCompleteSet(
                        productId, product.getStatus(), resultingInputs);

        replaceImagesIfPresent(productId, request);
        products.save(product);

        if (request.isAttributeValuesPresent()) {
            replaceAttributeValues(productId, validatedValues);
        }

        flushOrConflict();

        audit.record(AuditWriteEvent.of(
                AuditAction.PRODUCT_UPDATE,
                AuditEntityType.PRODUCT,
                productId.toString()));
        return query.detailInternal(productId);
    }

    @PreAuthorize(WRITE)
    public void deleteProduct(Long actor, Long productId) {
        Product product = references.productForUpdate(productId);
        if (products.existsByParentProductId(productId)) {
            conflict("A parent product with children cannot be deleted");
        }
        product.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
        products.save(product);
        em.flush();
        audit.record(AuditWriteEvent.of(AuditAction.PRODUCT_DELETE, AuditEntityType.PRODUCT, productId.toString()));
    }

    private void replaceAttributeValues(
            Long productId, List<ProductAttributeValue> validatedValues) {
        productAttributeValues.deleteAllByProductId(productId);
        em.flush();
        for (ProductAttributeValue value : validatedValues) {
            productAttributeValues.save(value);
        }
    }

    private static ProductAttributeValueInput toInput(ProductAttributeValue value) {
        return new ProductAttributeValueInput(
                value.getAttributeId(),
                value.getOptionId(),
                value.getTextValue(),
                value.getNumberValue(),
                value.getBooleanValue());
    }

    private void validateParent(Long productId, Long parentProductId) {
        if (parentProductId == null) return;
        if (Objects.equals(productId, parentProductId)) {
            conflict("A product cannot be its own parent");
        }
        Product parent = references.productForUpdate(parentProductId);
        if (parent.getParentProductId() != null) {
            conflict("Product hierarchy is limited to one child level");
        }
        if (productId != null && products.existsByParentProductId(productId)) {
            conflict("A product with children cannot become a child");
        }
    }

    private void replaceImagesIfPresent(Long productId, ProductPatchRequest request) {
        if (!request.isImagesPresent()) return;
        List<ProductImageInput> requested = request.getImages();
        var sortOrders = new HashSet<Integer>();
        for (ProductImageInput item : requested) {
            if (!ProductImageUrlPolicy.isValid(item.image_url())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Image URL must be a valid HTTPS URI");
            }
            Integer sortOrder = item.sort_order();
            if (sortOrder == null || sortOrder < 0 || !sortOrders.add(sortOrder)) {
                conflict("Image sort order must be unique and non-negative");
            }
        }
        for (int expected = 0; expected < requested.size(); expected++) {
            if (!sortOrders.contains(expected)) {
                conflict("Image sort order must be contiguous");
            }
        }
        images.deleteAllByProductId(productId);
        em.flush();
        for (ProductImageInput item : requested) {
            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setImageUrl(item.image_url());
            image.setSortOrder(item.sort_order());
            image.setIsPrimary(item.sort_order() == 0);
            images.save(image);
        }
    }

    private void flushOrConflict() {
        try {
            em.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Product violates a unique or foreign-key constraint", exception);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static void conflict(String message) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
