package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.product.dto.request.*;
import com.fido.modules.product.dto.response.*;
import com.fido.modules.product.entity.*;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.*;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CatalogAdminService {
    private static final String WRITE = "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ColorRepository colors;
    private final CatalogQueryService query;
    private final AuditService audit;
    private final EntityManager em;

    public CatalogAdminService(ProductRepository products, ProductVariantRepository variants,
            ProductImageRepository images, CategoryRepository categories, BrandRepository brands,
            SizeSystemRepository sizeSystems, SizeValueRepository sizeValues, ColorRepository colors,
            CatalogQueryService query, AuditService audit, EntityManager em) {
        this.products=products;this.variants=variants;this.images=images;this.categories=categories;this.brands=brands;
        this.sizeSystems=sizeSystems;this.sizeValues=sizeValues;this.colors=colors;this.query=query;this.audit=audit;this.em=em;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto createProduct(Long actor, ProductCreateRequest r) {
        Category category=leafCategory(r.category_id());
        if(r.brand_id()!=null) brand(r.brand_id());
        sizeSystem(r.size_system_id());
        CatalogPolicy.requireSaleStatus(r.sale_status());

        Product p=new Product();
        p.setCategoryId(category.getCategoryId());p.setBrandId(r.brand_id());p.setSizeSystemId(r.size_system_id());
        p.setName(r.name());p.setDescription(r.description());p.setGender(r.gender());p.setSeason(r.season());
        p.setStyle(r.style());p.setMaterialCare(r.material_care());p.setBasePrice(r.base_price());p.setSaleStatus(r.sale_status());
        products.save(p);
        saveImages(p.getProductId(),r.images()==null?List.of():r.images());
        if(r.variants()!=null&&!r.variants().isEmpty()) {
            createVariantsInternal(p,r.variants().stream()
                    .map(v->new VariantInput(v.size_value_id(),v.color_id(),v.sku(),v.override_price(),v.sale_status())).toList());
        }
        em.flush();
        audit.record(actor,"PRODUCT_CREATE","PRODUCT",p.getProductId());
        return query.adminDetailInternal(p.getProductId());
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto updateProduct(Long actor, Long productId, ProductPatchRequest r) {
        Product p=product(productId);
        if(r.getCategoryId()!=null) p.setCategoryId(leafCategory(r.getCategoryId()).getCategoryId());
        if(r.isBrandIdPresent()) {
            if(r.getBrandId()!=null) brand(r.getBrandId());
            p.setBrandId(r.getBrandId());
        }
        if(r.getSizeSystemId()!=null && !Objects.equals(r.getSizeSystemId(),p.getSizeSystemId())) {
            sizeSystem(r.getSizeSystemId());
            for(ProductVariant v:variants.findAllByProductIdOrderByVariantIdAsc(productId)) {
                if(!Objects.equals(sizeValue(v.getSizeValueId()).getSizeSystemId(),r.getSizeSystemId())) conflict();
            }
            p.setSizeSystemId(r.getSizeSystemId());
        }
        if(r.getName()!=null)p.setName(r.getName());
        if(r.isDescriptionPresent())p.setDescription(r.getDescription());
        if(r.isGenderPresent())p.setGender(r.getGender());
        if(r.isSeasonPresent())p.setSeason(r.getSeason());
        if(r.isStylePresent())p.setStyle(r.getStyle());
        if(r.isMaterialCarePresent())p.setMaterialCare(r.getMaterialCare());
        if(r.getBasePrice()!=null)p.setBasePrice(r.getBasePrice());
        if(r.getSaleStatus()!=null){CatalogPolicy.requireSaleStatus(r.getSaleStatus());p.setSaleStatus(r.getSaleStatus());}
        if(r.isImagesPresent()){images.deleteAllByProductId(productId);saveImages(productId,r.getImages());}

        products.save(p);em.flush();
        audit.record(actor,"PRODUCT_UPDATE","PRODUCT",productId);
        return query.adminDetailInternal(productId);
    }

    @PreAuthorize(WRITE)
    public List<AdminVariantDto> createVariants(Long actor, Long productId, VariantBatchCreateRequest r) {
        Product p=product(productId);
        createVariantsInternal(p,r.variants().stream()
                .map(v->new VariantInput(v.size_value_id(),v.color_id(),v.sku(),v.override_price(),v.sale_status())).toList());
        em.flush();
        audit.record(actor,"VARIANT_CREATE","PRODUCT",productId);
        return query.adminVariantsInternal(productId);
    }

    @PreAuthorize(WRITE)
    public AdminVariantDto updateVariant(Long actor, Long productId, Long variantId, VariantPatchRequest r) {
        product(productId);
        ProductVariant v=variants.findByVariantIdAndProductId(variantId,productId)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(r.isOverridePricePresent())v.setOverridePrice(r.getOverridePrice());
        if(r.getSaleStatus()!=null){CatalogPolicy.requireSaleStatus(r.getSaleStatus());v.setSaleStatus(r.getSaleStatus());}
        variants.save(v);em.flush();
        audit.record(actor,"VARIANT_UPDATE","VARIANT",variantId);
        return query.adminVariantInternal(productId,variantId);
    }

    @PreAuthorize(WRITE)
    public CategoryDto createCategory(Long actor, CategoryCreateRequest r) {
        validateParent(null,r.parent_category_id());
        Category c=new Category();c.setParentCategoryId(r.parent_category_id());c.setName(r.name());categories.save(c);em.flush();
        audit.record(actor,"CATEGORY_CREATE","CATEGORY",c.getCategoryId());
        return CatalogMapper.category(c);
    }

    @PreAuthorize(WRITE)
    public CategoryDto updateCategory(Long actor, Long id, CategoryPatchRequest r) {
        Category c=category(id);
        if(r.isParentPresent()){validateParent(id,r.getParentCategoryId());c.setParentCategoryId(r.getParentCategoryId());}
        if(r.getName()!=null)c.setName(r.getName());
        categories.save(c);em.flush();
        audit.record(actor,"CATEGORY_UPDATE","CATEGORY",id);
        return CatalogMapper.category(c);
    }

    @PreAuthorize(WRITE)
    public void deleteCategory(Long actor, Long id) {
        Category c=category(id);
        if(categories.existsByParentCategoryId(id)||products.existsByCategoryId(id)) conflict();
        categories.delete(c);em.flush();
        audit.record(actor,"CATEGORY_DELETE","CATEGORY",id);
    }

    @PreAuthorize(WRITE)
    public BrandDto createBrand(Long actor, BrandRequest r) {
        Brand b=new Brand();b.setName(r.name());brands.save(b);em.flush();
        audit.record(actor,"BRAND_CREATE","BRAND",b.getBrandId());
        return CatalogMapper.brand(b);
    }

    @PreAuthorize(WRITE)
    public BrandDto updateBrand(Long actor, Long id, BrandRequest r) {
        Brand b=brand(id);b.setName(r.name());brands.save(b);em.flush();
        audit.record(actor,"BRAND_UPDATE","BRAND",id);
        return CatalogMapper.brand(b);
    }

    @PreAuthorize(WRITE)
    public void deleteBrand(Long actor, Long id) {
        Brand b=brand(id);
        if(products.existsByBrandId(id)) conflict();
        brands.delete(b);em.flush();
        audit.record(actor,"BRAND_DELETE","BRAND",id);
    }

    @PreAuthorize(WRITE)
    public SizeSystemDto createSizeSystem(Long actor, SizeSystemCreateRequest r) {
        SizeSystem s=new SizeSystem();s.setCode(r.code());s.setName(r.name());sizeSystems.save(s);
        var requested=r.size_values()==null?List.<SizeSystemCreateRequest.SizeValueInput>of():r.size_values();
        validateCodes(requested.stream().map(SizeSystemCreateRequest.SizeValueInput::code).toList());
        for(var item:requested){
            SizeValue v=new SizeValue();v.setSizeSystemId(s.getSizeSystemId());v.setCode(item.code());
            v.setDisplayName(item.display_name());v.setSortOrder(item.sort_order());sizeValues.save(v);
        }
        em.flush();
        audit.record(actor,"SIZE_SYSTEM_CREATE","SIZE_SYSTEM",s.getSizeSystemId());
        return query.sizeSystemDtoInternal(s.getSizeSystemId());
    }

    @PreAuthorize(WRITE)
    public SizeSystemDto updateSizeSystem(Long actor, Long id, SizeSystemPatchRequest r) {
        SizeSystem s=sizeSystem(id);
        if(r.getCode()!=null)s.setCode(r.getCode());
        if(r.getName()!=null)s.setName(r.getName());
        sizeSystems.save(s);
        if(r.isSizeValuesPresent()) replaceSizeValues(id,r.getSizeValues());
        em.flush();
        audit.record(actor,"SIZE_SYSTEM_UPDATE","SIZE_SYSTEM",id);
        return query.sizeSystemDtoInternal(id);
    }

    @PreAuthorize(WRITE)
    public void deleteSizeSystem(Long actor, Long id) {
        SizeSystem s=sizeSystem(id);
        if(products.existsBySizeSystemId(id)) conflict();
        for(SizeValue v:sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(id)) {
            if(variants.existsBySizeValueId(v.getSizeValueId())) conflict();
            sizeValues.delete(v);
        }
        sizeSystems.delete(s);em.flush();
        audit.record(actor,"SIZE_SYSTEM_DELETE","SIZE_SYSTEM",id);
    }

    @PreAuthorize(WRITE)
    public ColorDto createColor(Long actor, ColorCreateRequest r) {
        Color c=new Color();c.setCode(r.code());c.setName(r.name());colors.save(c);em.flush();
        audit.record(actor,"COLOR_CREATE","COLOR",c.getColorId());
        return CatalogMapper.color(c);
    }

    @PreAuthorize(WRITE)
    public ColorDto updateColor(Long actor, Long id, ColorPatchRequest r) {
        Color c=color(id);
        boolean changes=(r.getCode()!=null&&!r.getCode().equals(c.getCode()))
                ||(r.getName()!=null&&!r.getName().equals(c.getName()));
        if(changes&&variants.existsByColorId(id)) conflict();
        if(r.getCode()!=null)c.setCode(r.getCode());
        if(r.getName()!=null)c.setName(r.getName());
        colors.save(c);em.flush();
        audit.record(actor,"COLOR_UPDATE","COLOR",id);
        return CatalogMapper.color(c);
    }

    @PreAuthorize(WRITE)
    public void deleteColor(Long actor, Long id) {
        Color c=color(id);
        if(variants.existsByColorId(id)) conflict();
        colors.delete(c);em.flush();
        audit.record(actor,"COLOR_DELETE","COLOR",id);
    }

    private void createVariantsInternal(Product p, List<VariantInput> requested) {
        var combos=new HashSet<String>();
        var skus=new HashSet<String>();
        for(VariantInput item:requested) {
            CatalogPolicy.requireSaleStatus(item.saleStatus());
            SizeValue size=sizeValue(item.sizeValueId());
            if(!Objects.equals(size.getSizeSystemId(),p.getSizeSystemId())) conflict();
            color(item.colorId());
            String key=item.sizeValueId()+":"+item.colorId();
            if(!combos.add(key)) conflict();
            if(item.sku()!=null&&!item.sku().isBlank()&&!skus.add(item.sku())) conflict();
            if(variants.existsByProductIdAndSizeValueIdAndColorId(p.getProductId(),item.sizeValueId(),item.colorId())) conflict();
            ProductVariant v=new ProductVariant();
            v.setProductId(p.getProductId());v.setSizeValueId(item.sizeValueId());v.setColorId(item.colorId());
            v.setSku(item.sku());v.setOverridePrice(item.overridePrice());v.setSaleStatus(item.saleStatus());
            variants.save(v);
        }
    }

    private void saveImages(Long productId, List<ProductCreateRequest.ImageInput> requested) {
        for(var item:requested){
            ProductImage i=new ProductImage();i.setProductId(productId);i.setImageUrl(item.image_url());i.setAltText(item.alt_text());
            images.save(i);
        }
    }

    private void replaceSizeValues(Long systemId, List<SizeSystemPatchRequest.SizeValueInput> requested) {
        validateCodes(requested.stream().map(SizeSystemPatchRequest.SizeValueInput::code).toList());
        var current=sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(systemId);
        var byId=new HashMap<Long,SizeValue>();current.forEach(v->byId.put(v.getSizeValueId(),v));
        var kept=new HashSet<Long>();
        for(var item:requested) {
            if(item.size_value_id()==null) {
                SizeValue v=new SizeValue();v.setSizeSystemId(systemId);v.setCode(item.code());
                v.setDisplayName(item.display_name());v.setSortOrder(item.sort_order());sizeValues.save(v);
                continue;
            }
            if(!kept.add(item.size_value_id())) conflict();
            SizeValue v=byId.get(item.size_value_id());
            if(v==null) notFound();
            boolean meaningChange=!v.getCode().equals(item.code())||!v.getDisplayName().equals(item.display_name());
            if(meaningChange&&variants.existsBySizeValueId(v.getSizeValueId())) conflict();
            v.setCode(item.code());v.setDisplayName(item.display_name());v.setSortOrder(item.sort_order());sizeValues.save(v);
        }
        for(SizeValue v:current) {
            if(!kept.contains(v.getSizeValueId())) {
                if(variants.existsBySizeValueId(v.getSizeValueId())) conflict();
                sizeValues.delete(v);
            }
        }
    }

    private void validateCodes(List<String> codes) {
        var set=new HashSet<String>();
        for(String code:codes) if(!set.add(code.toLowerCase(Locale.ROOT))) conflict();
    }

    private Category leafCategory(Long id){Category c=category(id);if(categories.existsByParentCategoryId(id))conflict();return c;}
    private void validateParent(Long categoryId, Long parentId) {
        if(parentId==null)return;
        if(Objects.equals(categoryId,parentId))conflict();
        Category parent=category(parentId);
        if(products.existsByCategoryId(parentId))conflict();
        var seen=new HashSet<Long>();
        Long cursor=parent.getCategoryId();
        while(cursor!=null){
            if(!seen.add(cursor)||Objects.equals(cursor,categoryId))conflict();
            cursor=category(cursor).getParentCategoryId();
        }
    }
    private Product product(Long id){return products.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Category category(Long id){return categories.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Brand brand(Long id){return brands.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private SizeSystem sizeSystem(Long id){return sizeSystems.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private SizeValue sizeValue(Long id){return sizeValues.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Color color(Long id){return colors.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private void conflict(){throw new ResponseStatusException(HttpStatus.CONFLICT);}
    private void notFound(){throw new ResponseStatusException(HttpStatus.NOT_FOUND);}
    private record VariantInput(Long sizeValueId, Long colorId, String sku, BigDecimal overridePrice, String saleStatus){}
}
