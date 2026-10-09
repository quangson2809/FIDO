package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.request.ProductImageInput;
import com.fido.modules.product.dto.request.ProductPatchRequest;
import com.fido.modules.product.dto.request.VariantBatchCreateRequest;
import com.fido.modules.product.dto.request.VariantPatchRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.entity.ProductVariant;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProductAdminService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;
    private final InventoryCommandService inventory;
    private final CatalogReferenceService references;
    private final AdminCatalogQueryService query;
    private final AuditService audit;
    private final EntityManager em;

    public ProductAdminService(
            ProductRepository products,
            ProductVariantRepository variants,
            ProductImageRepository images,
            InventoryCommandService inventory,
            CatalogReferenceService references,
            AdminCatalogQueryService query,
            AuditService audit,
            EntityManager em
    ) {
        this.products = products;
        this.variants = variants;
        this.images = images;
        this.inventory = inventory;
        this.references = references;
        this.query = query;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto createProduct(
            Long actor,
            ProductCreateRequest request
    ) {
        Category category = references.leafCategory(request.category_id());

        if (request.brand_id() != null) {
            references.brand(request.brand_id());
        }

        references.sizeSystem(request.size_system_id());
        CatalogPolicy.requireSaleStatus(request.sale_status());

        Product product = new Product();
        product.setCategoryId(category.getCategoryId());
        product.setBrandId(request.brand_id());
        product.setSizeSystemId(request.size_system_id());
        product.setName(request.name());
        product.setDescription(request.description());
        product.setGender(request.gender());
        product.setSeason(request.season());
        product.setStyle(request.style());
        product.setMaterialCare(request.material_care());
        product.setBasePrice(request.base_price());
        product.setSaleStatus(request.sale_status());

        products.save(product);

        if (request.variants() != null
                && !request.variants().isEmpty()) {
            var variantInputs = request.variants()
                    .stream()
                    .map(variant -> new VariantInput(
                            variant.size_value_id(),
                            variant.color_id(),
                            variant.sku(),
                            variant.override_price(),
                            variant.sale_status()
                    ))
                    .toList();

            createVariantsInternal(
                    product,
                    variantInputs
            );
        }

        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.PRODUCT_CREATE,
                        AuditTargetType.PRODUCT,
                        product.getProductId()
                )
        );

        return query.detailInternal(
                product.getProductId()
        );
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto updateProduct(
            Long actor,
            Long productId,
            ProductPatchRequest request
    ) {
        Product product = references.productForUpdate(productId);

        applyReferenceChanges(
                product,
                request
        );

        applyProductAttributes(
                product,
                request
        );

        replaceImagesIfPresent(
                productId,
                request
        );

        products.save(product);
        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.PRODUCT_UPDATE,
                        AuditTargetType.PRODUCT,
                        productId
                )
        );

        return query.detailInternal(productId);
    }

    private void applyReferenceChanges(
            Product product,
            ProductPatchRequest request
    ) {
        applyCategoryChange(product, request);
        applyBrandChange(product, request);
        applySizeSystemChange(product, request);
    }

    private void applyCategoryChange(
            Product product,
            ProductPatchRequest request
    ) {
        if (request.getCategoryId() == null) {
            return;
        }

        product.setCategoryId(
                references.leafCategory(request.getCategoryId())
                        .getCategoryId()
        );
    }

    private void applyBrandChange(
            Product product,
            ProductPatchRequest request
    ) {
        if (!request.isBrandIdPresent()) {
            return;
        }

        if (request.getBrandId() != null) {
            references.brand(request.getBrandId());
        }

        product.setBrandId(request.getBrandId());
    }

    private void applySizeSystemChange(
            Product product,
            ProductPatchRequest request
    ) {
        Long requestedSizeSystemId = request.getSizeSystemId();

        if (requestedSizeSystemId == null
                || Objects.equals(
                        requestedSizeSystemId,
                        product.getSizeSystemId()
                )) {
            return;
        }

        references.sizeSystem(requestedSizeSystemId);
        requireVariantsCompatibleWithSizeSystem(
                product.getProductId(),
                requestedSizeSystemId
        );

        product.setSizeSystemId(requestedSizeSystemId);
    }

    private void requireVariantsCompatibleWithSizeSystem(
            Long productId,
            Long sizeSystemId
    ) {
        for (ProductVariant variant :
                variants.findAllByProductIdOrderByVariantIdAsc(productId)) {
            SizeValue value = references.sizeValue(
                    variant.getSizeValueId()
            );

            if (!Objects.equals(
                    value.getSizeSystemId(),
                    sizeSystemId
            )) {
                conflict();
            }
        }
    }

    private void applyProductAttributes(
            Product product,
            ProductPatchRequest request
    ) {
        if (request.getName() != null) {
            product.setName(request.getName());
        }

        if (request.isDescriptionPresent()) {
            product.setDescription(request.getDescription());
        }

        if (request.isGenderPresent()) {
            product.setGender(request.getGender());
        }

        if (request.isSeasonPresent()) {
            product.setSeason(request.getSeason());
        }

        if (request.isStylePresent()) {
            product.setStyle(request.getStyle());
        }

        if (request.isMaterialCarePresent()) {
            product.setMaterialCare(request.getMaterialCare());
        }

        if (request.getBasePrice() != null) {
            product.setBasePrice(request.getBasePrice());
        }

        if (request.getSaleStatus() != null) {
            CatalogPolicy.requireSaleStatus(request.getSaleStatus());
            product.setSaleStatus(request.getSaleStatus());
        }
    }

    private void replaceImagesIfPresent(
            Long productId,
            ProductPatchRequest request
    ) {
        if (!request.isImagesPresent()) {
            return;
        }

        List<ProductImageInput> requested = request.getImages();
        requireNormalizedImageOrder(requested);

        images.deleteAllByProductId(productId);
        em.flush();

        saveImages(productId, requested);
    }

    private void requireNormalizedImageOrder(
            List<ProductImageInput> requested
    ) {
        var sortOrders = new HashSet<Integer>();

        for (ProductImageInput item : requested) {
            if (!ProductImageUrlPolicy.isValid(item.image_url())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image URL must be a valid HTTPS URI");
            }
            Integer sortOrder = item.sort_order();
            if (sortOrder == null
                    || sortOrder < 0
                    || !sortOrders.add(sortOrder)) {
                conflict();
            }
        }

        for (int expected = 0; expected < requested.size(); expected++) {
            if (!sortOrders.contains(expected)) {
                conflict();
            }
        }
    }

    @PreAuthorize(WRITE)
    public List<AdminVariantDto> createVariants(
            Long actor,
            Long productId,
            VariantBatchCreateRequest request
    ) {
        // Serialize size-system changes and variant creation on the same product row.
        Product product = references.productForUpdate(productId);

        var variantInputs = request.variants()
                .stream()
                .map(variant -> new VariantInput(
                        variant.size_value_id(),
                        variant.color_id(),
                        variant.sku(),
                        variant.override_price(),
                        variant.sale_status()
                ))
                .toList();

        createVariantsInternal(
                product,
                variantInputs
        );

        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.VARIANT_CREATE,
                        AuditTargetType.PRODUCT,
                        productId
                )
        );

        return query.variantsInternal(productId);
    }

    @PreAuthorize(WRITE)
    public AdminVariantDto updateVariant(
            Long actor,
            Long productId,
            Long variantId,
            VariantPatchRequest request
    ) {
        references.product(productId);

        ProductVariant variant = variants
                .findByVariantIdAndProductId(
                        variantId,
                        productId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );

        if (request.isOverridePricePresent()) {
            variant.setOverridePrice(request.getOverridePrice());
        }

        if (request.getSaleStatus() != null) {
            CatalogPolicy.requireSaleStatus(
                    request.getSaleStatus()
            );

            variant.setSaleStatus(
                    request.getSaleStatus()
            );
        }

        variants.save(variant);
        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.VARIANT_UPDATE,
                        AuditTargetType.VARIANT,
                        variantId
                )
        );

        return query.variantInternal(
                productId,
                variantId
        );
    }

    private void createVariantsInternal(
            Product product,
            List<VariantInput> requested
    ) {
        var combinations = new HashSet<String>();
        var skus = new HashSet<String>();

        for (VariantInput item : requested) {
            CatalogPolicy.requireSaleStatus(
                    item.saleStatus()
            );

            SizeValue sizeValue = references.sizeValue(
                    item.sizeValueId()
            );

            if (!Objects.equals(
                    sizeValue.getSizeSystemId(),
                    product.getSizeSystemId()
            )) {
                conflict();
            }

            references.color(item.colorId());

            String combinationKey =
                    item.sizeValueId() + ":" + item.colorId();

            if (!combinations.add(combinationKey)) {
                conflict();
            }

            if (item.sku() != null
                    && !item.sku().isBlank()
                    && !skus.add(item.sku())) {
                conflict();
            }

            if (variants.existsByProductIdAndSizeValueIdAndColorId(
                    product.getProductId(),
                    item.sizeValueId(),
                    item.colorId()
            )) {
                conflict();
            }

            ProductVariant variant = new ProductVariant();
            variant.setProductId(product.getProductId());
            variant.setSizeValueId(item.sizeValueId());
            variant.setColorId(item.colorId());
            variant.setSku(item.sku());
            variant.setOverridePrice(item.overridePrice());
            variant.setSaleStatus(item.saleStatus());

            variants.save(variant);
            inventory.initializeVariant(variant.getVariantId());
        }
    }

    private void saveImages(
            Long productId,
            List<ProductImageInput> requested
    ) {
        for (ProductImageInput item : requested) {
            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setImageUrl(item.image_url());
            image.setAltText(item.alt_text());
            image.setSortOrder(item.sort_order());

            images.save(image);
        }
    }

    private void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT);
    }

    private record VariantInput(
            Long sizeValueId,
            Long colorId,
            String sku,
            BigDecimal overridePrice,
            String saleStatus
    ) {
    }
}
