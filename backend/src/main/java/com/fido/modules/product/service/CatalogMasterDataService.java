package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.product.dto.request.BrandPatchRequest;
import com.fido.modules.product.dto.request.BrandRequest;
import com.fido.modules.product.dto.request.CategoryCreateRequest;
import com.fido.modules.product.dto.request.CategoryPatchRequest;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.entity.Brand;
import com.fido.modules.product.entity.Category;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductRepository;

import jakarta.persistence.EntityManager;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.HashSet;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional
public class CatalogMasterDataService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final ProductRepository products;
    private final CatalogReferenceService references;
    private final AuditService audit;
    private final EntityManager em;

    public CatalogMasterDataService(
            CategoryRepository categories,
            BrandRepository brands,
            ProductRepository products,
            CatalogReferenceService references,
            AuditService audit,
            EntityManager em) {
        this.categories = categories;
        this.brands = brands;
        this.products = products;
        this.references = references;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize(WRITE)
    public CategoryDto createCategory(Long actor, CategoryCreateRequest request) {
        validateParent(null, request.parent_category_id());
        String name = request.name().trim();
        String slug = slug(name);
        String status = request.status() == null ? "ACTIVE" : request.status();
        CatalogPolicy.requireMasterDataStatus(status);
        requireCategorySlugAvailable(slug, null);

        Category category = new Category();
        category.setParentCategoryId(request.parent_category_id());
        category.setName(name);
        category.setSlug(slug);
        category.setStatus(status);

        categories.save(category);
        flushOrConflict("Category slug or parent reference conflicts with existing data");
        audit.record(AuditEvent.of(
                actor, AuditAction.CATEGORY_CREATE, AuditTargetType.CATEGORY, category.getCategoryId()));
        return CatalogMapper.category(category);
    }

    @PreAuthorize(WRITE)
    public CategoryDto updateCategory(Long actor, Long categoryId, CategoryPatchRequest request) {
        if (!request.hasChanges()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category patch must contain a change");
        }
        Category category = references.categoryForUpdate(categoryId);
        if (request.isParentPresent()) {
            validateParent(categoryId, request.getParentCategoryId());
            category.setParentCategoryId(request.getParentCategoryId());
        }
        if (request.isNamePresent()) {
            String name = request.getName().trim();
            String slug = slug(name);
            requireCategorySlugAvailable(slug, categoryId);
            category.setName(name);
            category.setSlug(slug);
        }
        if (request.isStatusPresent()) {
            CatalogPolicy.requireMasterDataStatus(request.getStatus());
            category.setStatus(request.getStatus());
        }
        categories.save(category);
        flushOrConflict("Category violates a uniqueness or reference constraint");
        audit.record(AuditEvent.of(
                actor, AuditAction.CATEGORY_UPDATE, AuditTargetType.CATEGORY, categoryId));
        return CatalogMapper.category(category);
    }

    @PreAuthorize(WRITE)
    public void deleteCategory(Long actor, Long categoryId) {
        Category category = references.category(categoryId);
        if (categories.existsByParentCategoryId(categoryId) || products.existsByCategoryId(categoryId)) {
            conflict("Category is still referenced");
        }
        categories.delete(category);
        flushOrConflict("Category is still referenced");
        audit.record(AuditEvent.of(
                actor, AuditAction.CATEGORY_DELETE, AuditTargetType.CATEGORY, categoryId));
    }

    @PreAuthorize(WRITE)
    public BrandDto createBrand(Long actor, BrandRequest request) {
        String name = request.name().trim();
        String slug = slug(name);
        String status = request.status() == null ? "ACTIVE" : request.status();
        CatalogPolicy.requireMasterDataStatus(status);
        requireBrandSlugAvailable(slug, null);

        Brand brand = new Brand();
        brand.setName(name);
        brand.setSlug(slug);
        brand.setStatus(status);
        brands.save(brand);
        flushOrConflict("Brand slug conflicts with existing data");
        audit.record(AuditEvent.of(actor, AuditAction.BRAND_CREATE, AuditTargetType.BRAND, brand.getBrandId()));
        return CatalogMapper.brand(brand);
    }

    @PreAuthorize(WRITE)
    public BrandDto updateBrand(Long actor, Long brandId, BrandPatchRequest request) {
        if (!request.hasChanges()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Brand patch must contain a change");
        }
        Brand brand = references.brand(brandId);
        if (request.isNamePresent()) {
            String name = request.getName().trim();
            String slug = slug(name);
            requireBrandSlugAvailable(slug, brandId);
            brand.setName(name);
            brand.setSlug(slug);
        }
        if (request.isStatusPresent()) {
            CatalogPolicy.requireMasterDataStatus(request.getStatus());
            brand.setStatus(request.getStatus());
        }
        brands.save(brand);
        flushOrConflict("Brand violates a uniqueness or reference constraint");
        audit.record(AuditEvent.of(actor, AuditAction.BRAND_UPDATE, AuditTargetType.BRAND, brandId));
        return CatalogMapper.brand(brand);
    }

    @PreAuthorize(WRITE)
    public void deleteBrand(Long actor, Long brandId) {
        Brand brand = references.brand(brandId);
        if (products.existsByBrandId(brandId)) {
            conflict("Brand is still referenced");
        }
        brands.delete(brand);
        flushOrConflict("Brand is still referenced");
        audit.record(AuditEvent.of(actor, AuditAction.BRAND_DELETE, AuditTargetType.BRAND, brandId));
    }

    private void validateParent(Long categoryId, Long parentId) {
        if (parentId == null) return;
        if (Objects.equals(categoryId, parentId)) conflict("Category cannot be its own parent");

        Category parent = references.category(parentId);
        Set<Long> seen = new HashSet<>();
        Long cursor = parent.getCategoryId();
        while (cursor != null) {
            if (!seen.add(cursor) || Objects.equals(cursor, categoryId)) {
                conflict("Category hierarchy contains a cycle");
            }
            cursor = references.category(cursor).getParentCategoryId();
        }
    }

    private void requireCategorySlugAvailable(String slug, Long categoryId) {
        boolean exists = categoryId == null
                ? categories.existsBySlug(slug)
                : categories.existsBySlugAndCategoryIdNot(slug, categoryId);
        if (exists) conflict("Category slug already exists");
    }

    private void requireBrandSlugAvailable(String slug, Long brandId) {
        boolean exists = brandId == null
                ? brands.existsBySlug(slug)
                : brands.existsBySlugAndBrandIdNot(slug, brandId);
        if (exists) conflict("Brand slug already exists");
    }

    private void flushOrConflict(String message) {
        try {
            em.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message, exception);
        }
    }

    private static String slug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replace('\u0111', 'd').replace('\u0110', 'D');
        normalized = normalized.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        normalized = normalized.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name cannot produce a slug");
        }
        return normalized.length() > 180 ? normalized.substring(0, 180).replaceAll("-+$", "") : normalized;
    }

    private static void conflict(String message) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
