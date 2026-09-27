package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.product.dto.request.BrandRequest;
import com.fido.modules.product.dto.request.CategoryCreateRequest;
import com.fido.modules.product.dto.request.CategoryPatchRequest;
import com.fido.modules.product.dto.request.ColorCreateRequest;
import com.fido.modules.product.dto.request.ColorPatchRequest;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ColorDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.entity.Color;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import jakarta.persistence.EntityManager;
import java.util.HashSet;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CatalogMasterDataService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final ColorRepository colors;
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final CatalogReferenceService references;
    private final AuditService audit;
    private final EntityManager em;

    public CatalogMasterDataService(
            CategoryRepository categories,
            BrandRepository brands,
            ColorRepository colors,
            ProductRepository products,
            ProductVariantRepository variants,
            CatalogReferenceService references,
            AuditService audit,
            EntityManager em
    ) {
        this.categories = categories;
        this.brands = brands;
        this.colors = colors;
        this.products = products;
        this.variants = variants;
        this.references = references;
        this.audit = audit;
        this.em = em;
    }

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

        return CatalogMapper.references.category(category);
    }

    public CategoryDto updateCategory(
            Long actor,
            Long categoryId,
            CategoryPatchRequest request
    ) {
        Category category = references.category(categoryId);

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

        return CatalogMapper.references.category(category);
    }

    public void deleteCategory(
            Long actor,
            Long categoryId
    ) {
        Category category = references.category(categoryId);

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

        return CatalogMapper.references.brand(brand);
    }

    public BrandDto updateBrand(
            Long actor,
            Long brandId,
            BrandRequest request
    ) {
        Brand brand = references.brand(brandId);
        brand.setName(request.name());

        brands.save(brand);
        em.flush();

        audit.record(
                actor,
                "BRAND_UPDATE",
                "BRAND",
                brandId
        );

        return CatalogMapper.references.brand(brand);
    }

    public void deleteBrand(
            Long actor,
            Long brandId
    ) {
        Brand brand = references.brand(brandId);

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

        return CatalogMapper.references.color(color);
    }

    public ColorDto updateColor(
            Long actor,
            Long colorId,
            ColorPatchRequest request
    ) {
        Color color = references.color(colorId);

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

        return CatalogMapper.references.color(color);
    }

    public void deleteColor(
            Long actor,
            Long colorId
    ) {
        Color color = references.color(colorId);

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

        Category parent = references.category(parentId);

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

            cursor = references.category(cursor)
                    .getParentCategoryId();
        }
    }

    private void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT);
    }
}
