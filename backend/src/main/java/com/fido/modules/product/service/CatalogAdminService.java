package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.dto.request.BrandRequest;
import com.fido.modules.product.dto.request.CategoryCreateRequest;
import com.fido.modules.product.dto.request.CategoryPatchRequest;
import com.fido.modules.product.dto.request.ColorCreateRequest;
import com.fido.modules.product.dto.request.ColorPatchRequest;
import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.request.ProductPatchRequest;
import com.fido.modules.product.dto.request.SizeSystemCreateRequest;
import com.fido.modules.product.dto.request.SizeSystemPatchRequest;
import com.fido.modules.product.dto.request.VariantBatchCreateRequest;
import com.fido.modules.product.dto.request.VariantPatchRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ColorDto;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;
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
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CatalogAdminService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;

    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ColorRepository colors;

    private final InventoryAvailabilityService inventory;
    private final CatalogQueryService query;
    private final AuditService audit;
    private final EntityManager em;

    public CatalogAdminService(
            ProductRepository products,
            ProductVariantRepository variants,
            ProductImageRepository images,
            CategoryRepository categories,
            BrandRepository brands,
            SizeSystemRepository sizeSystems,
            SizeValueRepository sizeValues,
            ColorRepository colors,
            InventoryAvailabilityService inventory,
            CatalogQueryService query,
            AuditService audit,
            EntityManager em
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
        this.query = query;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto createProduct(
            Long actor,
            ProductCreateRequest request
    ) {
        Category category = leafCategory(request.category_id());

        if (request.brand_id() != null) {
            brand(request.brand_id());
        }

        sizeSystem(request.size_system_id());
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

        saveImages(
                product.getProductId(),
                request.images() == null
                        ? List.of()
                        : request.images()
        );

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
                actor,
                "PRODUCT_CREATE",
                "PRODUCT",
                product.getProductId()
        );

        return query.adminDetailInternal(
                product.getProductId()
        );
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto updateProduct(
            Long actor,
            Long productId,
            ProductPatchRequest request
    ) {
        Product product = product(productId);

        if (request.getCategoryId() != null) {
            product.setCategoryId(
                    leafCategory(request.getCategoryId())
                            .getCategoryId()
            );
        }

        if (request.isBrandIdPresent()) {
            if (request.getBrandId() != null) {
                brand(request.getBrandId());
            }

            product.setBrandId(request.getBrandId());
        }

        if (request.getSizeSystemId() != null
                && !Objects.equals(
                        request.getSizeSystemId(),
                        product.getSizeSystemId()
                )) {
            sizeSystem(request.getSizeSystemId());

            for (ProductVariant variant :
                    variants.findAllByProductIdOrderByVariantIdAsc(productId)) {
                SizeValue value = sizeValue(variant.getSizeValueId());

                if (!Objects.equals(
                        value.getSizeSystemId(),
                        request.getSizeSystemId()
                )) {
                    conflict();
                }
            }

            product.setSizeSystemId(request.getSizeSystemId());
        }

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

        if (request.isImagesPresent()) {
            images.deleteAllByProductId(productId);

            saveImages(
                    productId,
                    request.getImages()
            );
        }

        products.save(product);
        em.flush();

        audit.record(
                actor,
                "PRODUCT_UPDATE",
                "PRODUCT",
                productId
        );

        return query.adminDetailInternal(productId);
    }

    @PreAuthorize(WRITE)
    public List<AdminVariantDto> createVariants(
            Long actor,
            Long productId,
            VariantBatchCreateRequest request
    ) {
        Product product = product(productId);

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
                actor,
                "VARIANT_CREATE",
                "PRODUCT",
                productId
        );

        return query.adminVariantsInternal(productId);
    }

    @PreAuthorize(WRITE)
    public AdminVariantDto updateVariant(
            Long actor,
            Long productId,
            Long variantId,
            VariantPatchRequest request
    ) {
        product(productId);

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
                actor,
                "VARIANT_UPDATE",
                "VARIANT",
                variantId
        );

        return query.adminVariantInternal(
                productId,
                variantId
        );
    }

    @PreAuthorize(WRITE)
    public CategoryDto createCategory(
            Long actor,
            CategoryCreateRequest request
    ) {
        validateParent(
                null,
                request.parent_category_id()
        );

        Category category = new Category();
        category.setParentCategoryId(
                request.parent_category_id()
        );
        category.setName(request.name());

        categories.save(category);
        em.flush();

        audit.record(
                actor,
                "CATEGORY_CREATE",
                "CATEGORY",
                category.getCategoryId()
        );

        return CatalogMapper.category(category);
    }

    @PreAuthorize(WRITE)
    public CategoryDto updateCategory(
            Long actor,
            Long categoryId,
            CategoryPatchRequest request
    ) {
        Category category = category(categoryId);

        if (request.isParentPresent()) {
            validateParent(
                    categoryId,
                    request.getParentCategoryId()
            );

            category.setParentCategoryId(
                    request.getParentCategoryId()
            );
        }

        if (request.getName() != null) {
            category.setName(request.getName());
        }

        categories.save(category);
        em.flush();

        audit.record(
                actor,
                "CATEGORY_UPDATE",
                "CATEGORY",
                categoryId
        );

        return CatalogMapper.category(category);
    }

    @PreAuthorize(WRITE)
    public void deleteCategory(
            Long actor,
            Long categoryId
    ) {
        Category category = category(categoryId);

        boolean hasChildren = categories.existsByParentCategoryId(categoryId);
        boolean hasProducts = products.existsByCategoryId(categoryId);

        if (hasChildren || hasProducts) {
            conflict();
        }

        categories.delete(category);
        em.flush();

        audit.record(
                actor,
                "CATEGORY_DELETE",
                "CATEGORY",
                categoryId
        );
    }

    @PreAuthorize(WRITE)
    public BrandDto createBrand(
            Long actor,
            BrandRequest request
    ) {
        Brand brand = new Brand();
        brand.setName(request.name());

        brands.save(brand);
        em.flush();

        audit.record(
                actor,
                "BRAND_CREATE",
                "BRAND",
                brand.getBrandId()
        );

        return CatalogMapper.brand(brand);
    }

    @PreAuthorize(WRITE)
    public BrandDto updateBrand(
            Long actor,
            Long brandId,
            BrandRequest request
    ) {
        Brand brand = brand(brandId);
        brand.setName(request.name());

        brands.save(brand);
        em.flush();

        audit.record(
                actor,
                "BRAND_UPDATE",
                "BRAND",
                brandId
        );

        return CatalogMapper.brand(brand);
    }

    @PreAuthorize(WRITE)
    public void deleteBrand(
            Long actor,
            Long brandId
    ) {
        Brand brand = brand(brandId);

        if (products.existsByBrandId(brandId)) {
            conflict();
        }

        brands.delete(brand);
        em.flush();

        audit.record(
                actor,
                "BRAND_DELETE",
                "BRAND",
                brandId
        );
    }

    @PreAuthorize(WRITE)
    public SizeSystemDto createSizeSystem(
            Long actor,
            SizeSystemCreateRequest request
    ) {
        SizeSystem sizeSystem = new SizeSystem();
        sizeSystem.setCode(request.code());
        sizeSystem.setName(request.name());

        sizeSystems.save(sizeSystem);

        var requestedValues = request.size_values() == null
                ? List.<SizeSystemCreateRequest.SizeValueInput>of()
                : request.size_values();

        validateCodes(
                requestedValues.stream()
                        .map(SizeSystemCreateRequest.SizeValueInput::code)
                        .toList()
        );

        for (var item : requestedValues) {
            SizeValue value = new SizeValue();
            value.setSizeSystemId(sizeSystem.getSizeSystemId());
            value.setCode(item.code());
            value.setDisplayName(item.display_name());
            value.setSortOrder(item.sort_order());

            sizeValues.save(value);
        }

        em.flush();

        audit.record(
                actor,
                "SIZE_SYSTEM_CREATE",
                "SIZE_SYSTEM",
                sizeSystem.getSizeSystemId()
        );

        return query.sizeSystemDtoInternal(
                sizeSystem.getSizeSystemId()
        );
    }

    @PreAuthorize(WRITE)
    public SizeSystemDto updateSizeSystem(
            Long actor,
            Long sizeSystemId,
            SizeSystemPatchRequest request
    ) {
        SizeSystem sizeSystem = sizeSystem(sizeSystemId);

        if (request.getCode() != null) {
            sizeSystem.setCode(request.getCode());
        }

        if (request.getName() != null) {
            sizeSystem.setName(request.getName());
        }

        sizeSystems.save(sizeSystem);

        if (request.isSizeValuesPresent()) {
            replaceSizeValues(
                    sizeSystemId,
                    request.getSizeValues()
            );
        }

        em.flush();

        audit.record(
                actor,
                "SIZE_SYSTEM_UPDATE",
                "SIZE_SYSTEM",
                sizeSystemId
        );

        return query.sizeSystemDtoInternal(sizeSystemId);
    }

    @PreAuthorize(WRITE)
    public void deleteSizeSystem(
            Long actor,
            Long sizeSystemId
    ) {
        SizeSystem sizeSystem = sizeSystem(sizeSystemId);

        if (products.existsBySizeSystemId(sizeSystemId)) {
            conflict();
        }

        var currentValues =
                sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(
                        sizeSystemId
                );

        for (SizeValue value : currentValues) {
            if (variants.existsBySizeValueId(value.getSizeValueId())) {
                conflict();
            }

            sizeValues.delete(value);
        }

        sizeSystems.delete(sizeSystem);
        em.flush();

        audit.record(
                actor,
                "SIZE_SYSTEM_DELETE",
                "SIZE_SYSTEM",
                sizeSystemId
        );
    }

    @PreAuthorize(WRITE)
    public ColorDto createColor(
            Long actor,
            ColorCreateRequest request
    ) {
        Color color = new Color();
        color.setCode(request.code());
        color.setName(request.name());

        colors.save(color);
        em.flush();

        audit.record(
                actor,
                "COLOR_CREATE",
                "COLOR",
                color.getColorId()
        );

        return CatalogMapper.color(color);
    }

    @PreAuthorize(WRITE)
    public ColorDto updateColor(
            Long actor,
            Long colorId,
            ColorPatchRequest request
    ) {
        Color color = color(colorId);

        boolean meaningChanges =
                (request.getCode() != null
                        && !request.getCode().equals(color.getCode()))
                || (request.getName() != null
                        && !request.getName().equals(color.getName()));

        if (meaningChanges
                && variants.existsByColorId(colorId)) {
            conflict();
        }

        if (request.getCode() != null) {
            color.setCode(request.getCode());
        }

        if (request.getName() != null) {
            color.setName(request.getName());
        }

        colors.save(color);
        em.flush();

        audit.record(
                actor,
                "COLOR_UPDATE",
                "COLOR",
                colorId
        );

        return CatalogMapper.color(color);
    }

    @PreAuthorize(WRITE)
    public void deleteColor(
            Long actor,
            Long colorId
    ) {
        Color color = color(colorId);

        if (variants.existsByColorId(colorId)) {
            conflict();
        }

        colors.delete(color);
        em.flush();

        audit.record(
                actor,
                "COLOR_DELETE",
                "COLOR",
                colorId
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

            SizeValue sizeValue = sizeValue(
                    item.sizeValueId()
            );

            if (!Objects.equals(
                    sizeValue.getSizeSystemId(),
                    product.getSizeSystemId()
            )) {
                conflict();
            }

            color(item.colorId());

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
            List<ProductCreateRequest.ImageInput> requested
    ) {
        for (var item : requested) {
            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setImageUrl(item.image_url());
            image.setAltText(item.alt_text());

            images.save(image);
        }
    }

    private void replaceSizeValues(
            Long sizeSystemId,
            List<SizeSystemPatchRequest.SizeValueInput> requested
    ) {
        validateCodes(
                requested.stream()
                        .map(SizeSystemPatchRequest.SizeValueInput::code)
                        .toList()
        );

        var currentValues =
                sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(
                        sizeSystemId
                );

        var valuesById = new HashMap<Long, SizeValue>();
        currentValues.forEach(value ->
                valuesById.put(
                        value.getSizeValueId(),
                        value
                )
        );

        var keptIds = new HashSet<Long>();

        for (var item : requested) {
            if (item.size_value_id() == null) {
                SizeValue value = new SizeValue();
                value.setSizeSystemId(sizeSystemId);
                value.setCode(item.code());
                value.setDisplayName(item.display_name());
                value.setSortOrder(item.sort_order());

                sizeValues.save(value);
                continue;
            }

            if (!keptIds.add(item.size_value_id())) {
                conflict();
            }

            SizeValue value = valuesById.get(
                    item.size_value_id()
            );

            if (value == null) {
                notFound();
            }

            boolean meaningChanges =
                    !value.getCode().equals(item.code())
                    || !value.getDisplayName().equals(item.display_name());

            if (meaningChanges
                    && variants.existsBySizeValueId(value.getSizeValueId())) {
                conflict();
            }

            value.setCode(item.code());
            value.setDisplayName(item.display_name());
            value.setSortOrder(item.sort_order());

            sizeValues.save(value);
        }

        for (SizeValue value : currentValues) {
            if (!keptIds.contains(value.getSizeValueId())) {
                if (variants.existsBySizeValueId(value.getSizeValueId())) {
                    conflict();
                }

                sizeValues.delete(value);
            }
        }
    }

    private void validateCodes(List<String> codes) {
        var normalizedCodes = new HashSet<String>();

        for (String code : codes) {
            if (!normalizedCodes.add(
                    code.toLowerCase(Locale.ROOT)
            )) {
                conflict();
            }
        }
    }

    private Category leafCategory(Long categoryId) {
        Category category = category(categoryId);

        if (categories.existsByParentCategoryId(categoryId)) {
            conflict();
        }

        return category;
    }

    private void validateParent(
            Long categoryId,
            Long parentId
    ) {
        if (parentId == null) {
            return;
        }

        if (Objects.equals(categoryId, parentId)) {
            conflict();
        }

        Category parent = category(parentId);

        if (products.existsByCategoryId(parentId)) {
            conflict();
        }

        var seen = new HashSet<Long>();
        Long cursor = parent.getCategoryId();

        while (cursor != null) {
            if (!seen.add(cursor)
                    || Objects.equals(cursor, categoryId)) {
                conflict();
            }

            cursor = category(cursor)
                    .getParentCategoryId();
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

    private void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT);
    }

    private void notFound() {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND);
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
