package com.fido.modules.product.service;

import com.fido.common.response.*;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.product.dto.response.*;
import com.fido.modules.product.entity.*;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.*;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CatalogQueryService {
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ProductImageRepository images;
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ColorRepository colors;
    private final InventoryAvailabilityService inventory;

    public CatalogQueryService(ProductRepository products, ProductVariantRepository variants,
            ProductImageRepository images, CategoryRepository categories, BrandRepository brands,
            SizeSystemRepository sizeSystems, SizeValueRepository sizeValues, ColorRepository colors,
            InventoryAvailabilityService inventory) {
        this.products=products;this.variants=variants;this.images=images;this.categories=categories;this.brands=brands;
        this.sizeSystems=sizeSystems;this.sizeValues=sizeValues;this.colors=colors;this.inventory=inventory;
    }

    public ApiListResponse<ProductSummaryDto> publicProducts(String q, Long categoryId, Long brandId,
            BigDecimal minPrice, BigDecimal maxPrice, Long sizeValueId, Long colorId,
            String gender, String season, String style, Integer page, Integer pageSize) {
        if ((minPrice != null && minPrice.signum() < 0) || (maxPrice != null && maxPrice.signum() < 0)
                || (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        var pagination = pagination(page,pageSize);
        var result=products.findAll(publicSpec(q,categoryId,brandId,minPrice,maxPrice,sizeValueId,colorId,gender,season,style),
                pagination.toPageable());
        var categoryMap=categoryMap();var brandMap=brandMap();
        var data=result.getContent().stream().map(p -> new ProductSummaryDto(
                p.getProductId(),p.getName(),CatalogMapper.category(requiredCategory(categoryMap,p.getCategoryId())),
                p.getBrandId()==null?null:CatalogMapper.brand(requiredBrand(brandMap,p.getBrandId())),
                p.getBasePrice(),p.getSaleStatus())).toList();
        return ApiListResponse.of(data,pagination.meta(result.getTotalElements()));
    }

    public ProductDetailDto publicDetail(Long productId) {
        return publicDetailInternal(product(productId));
    }

    public CatalogMetaDto publicMeta() {
        return metaInternal();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_READ')")
    public ApiListResponse<AdminProductSummaryDto> adminProducts(String q, Long categoryId, Long brandId,
            Long sizeSystemId, String saleStatus, Integer page, Integer pageSize) {
        if (saleStatus != null) CatalogPolicy.requireSaleStatus(saleStatus);
        var pagination=pagination(page,pageSize);
        Specification<Product> spec=(root,query,cb)->{
            var predicates=new ArrayList<Predicate>();
            if(q!=null&&!q.isBlank()) predicates.add(cb.like(cb.lower(root.get("name")),"%"+q.trim().toLowerCase(Locale.ROOT)+"%"));
            if(categoryId!=null) predicates.add(cb.equal(root.get("categoryId"),categoryId));
            if(brandId!=null) predicates.add(cb.equal(root.get("brandId"),brandId));
            if(sizeSystemId!=null) predicates.add(cb.equal(root.get("sizeSystemId"),sizeSystemId));
            if(saleStatus!=null) predicates.add(cb.equal(root.get("saleStatus"),saleStatus));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        var result=products.findAll(spec,pagination.toPageable());
        return ApiListResponse.of(result.getContent().stream().map(CatalogMapper::adminSummary).toList(),
                pagination.meta(result.getTotalElements()));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_READ')")
    public AdminProductDetailDto adminDetail(Long productId) {
        return adminDetailInternal(productId);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_READ')")
    public CatalogMetaDto adminMeta() {
        return metaInternal();
    }

    AdminProductDetailDto adminDetailInternal(Long productId) {
        Product p=product(productId);
        var variantList=variants.findAllByProductIdOrderByVariantIdAsc(productId);
        var availability=inventory.availableQuantities(variantList.stream().map(ProductVariant::getVariantId).toList());
        var adminVariants=variantList.stream().map(v -> new AdminVariantDto(v.getVariantId(),v.getProductId(),
                v.getSizeValueId(),v.getColorId(),v.getSku(),v.getOverridePrice(),v.getSaleStatus(),
                availability.getOrDefault(v.getVariantId(),0),v.getCreatedAt(),v.getUpdatedAt())).toList();
        return new AdminProductDetailDto(p.getProductId(),p.getName(),p.getDescription(),
                CatalogMapper.category(category(p.getCategoryId())),brandDto(p.getBrandId()),sizeSystemDtoInternal(p.getSizeSystemId()),
                p.getGender(),p.getSeason(),p.getStyle(),p.getMaterialCare(),p.getBasePrice(),p.getSaleStatus(),
                images.findAllByProductIdOrderByImageIdAsc(productId).stream().map(CatalogMapper::image).toList(),
                adminVariants,p.getCategoryId(),p.getBrandId(),p.getSizeSystemId(),p.getCreatedAt(),p.getUpdatedAt());
    }

    List<AdminVariantDto> adminVariantsInternal(Long productId) {
        product(productId);
        var list=variants.findAllByProductIdOrderByVariantIdAsc(productId);
        var availability=inventory.availableQuantities(list.stream().map(ProductVariant::getVariantId).toList());
        return list.stream().map(v -> new AdminVariantDto(v.getVariantId(),v.getProductId(),v.getSizeValueId(),
                v.getColorId(),v.getSku(),v.getOverridePrice(),v.getSaleStatus(),
                availability.getOrDefault(v.getVariantId(),0),v.getCreatedAt(),v.getUpdatedAt())).toList();
    }

    AdminVariantDto adminVariantInternal(Long productId, Long variantId) {
        var v=variants.findByVariantIdAndProductId(variantId,productId)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        return new AdminVariantDto(v.getVariantId(),v.getProductId(),v.getSizeValueId(),v.getColorId(),v.getSku(),
                v.getOverridePrice(),v.getSaleStatus(),inventory.availableQuantity(v.getVariantId()),v.getCreatedAt(),v.getUpdatedAt());
    }

    SizeSystemDto sizeSystemDtoInternal(Long id) {
        var s=sizeSystem(id);
        return CatalogMapper.sizeSystem(s,sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(id)
                .stream().map(CatalogMapper::sizeValue).toList());
    }

    CatalogMetaDto metaInternal() {
        return new CatalogMetaDto(
                categories.findAllByOrderByCategoryIdAsc().stream().map(CatalogMapper::category).toList(),
                brands.findAllByOrderByBrandIdAsc().stream().map(CatalogMapper::brand).toList(),
                sizeSystems.findAllByOrderBySizeSystemIdAsc().stream().map(s -> sizeSystemDtoInternal(s.getSizeSystemId())).toList(),
                colors.findAllByOrderByColorIdAsc().stream().map(CatalogMapper::color).toList(),
                products.findDistinctGenders(),products.findDistinctSeasons(),products.findDistinctStyles());
    }

    private ProductDetailDto publicDetailInternal(Product p) {
        var variantList=variants.findAllByProductIdOrderByVariantIdAsc(p.getProductId());
        var availability=inventory.availableQuantities(variantList.stream().map(ProductVariant::getVariantId).toList());
        var publicVariants=variantList.stream().map(v -> {
            var size=sizeValue(v.getSizeValueId());var color=color(v.getColorId());
            BigDecimal effective=v.getOverridePrice()==null?p.getBasePrice():v.getOverridePrice();
            return new ProductVariantDto(v.getVariantId(),CatalogMapper.sizeValue(size),CatalogMapper.color(color),
                    v.getSku(),effective,v.getSaleStatus(),availability.getOrDefault(v.getVariantId(),0));
        }).toList();
        return new ProductDetailDto(p.getProductId(),p.getName(),p.getDescription(),CatalogMapper.category(category(p.getCategoryId())),
                brandDto(p.getBrandId()),sizeSystemDtoInternal(p.getSizeSystemId()),p.getGender(),p.getSeason(),p.getStyle(),
                p.getMaterialCare(),p.getBasePrice(),p.getSaleStatus(),
                images.findAllByProductIdOrderByImageIdAsc(p.getProductId()).stream().map(CatalogMapper::image).toList(),publicVariants);
    }

    private Specification<Product> publicSpec(String q,Long categoryId,Long brandId,BigDecimal minPrice,BigDecimal maxPrice,
            Long sizeValueId,Long colorId,String gender,String season,String style) {
        return (root,query,cb)->{
            var predicates=new ArrayList<Predicate>();
            predicates.add(cb.equal(root.get("saleStatus"),CatalogPolicy.ON_SALE));
            if(q!=null&&!q.isBlank()) predicates.add(cb.like(cb.lower(root.get("name")),"%"+q.trim().toLowerCase(Locale.ROOT)+"%"));
            if(categoryId!=null) predicates.add(cb.equal(root.get("categoryId"),categoryId));
            if(brandId!=null) predicates.add(cb.equal(root.get("brandId"),brandId));
            if(gender!=null&&!gender.isBlank()) predicates.add(cb.equal(root.get("gender"),gender));
            if(season!=null&&!season.isBlank()) predicates.add(cb.equal(root.get("season"),season));
            if(style!=null&&!style.isBlank()) predicates.add(cb.equal(root.get("style"),style));

            Subquery<Long> sq=query.subquery(Long.class);
            var v=sq.from(ProductVariant.class);
            var vp=new ArrayList<Predicate>();
            vp.add(cb.equal(v.get("productId"),root.get("productId")));
            vp.add(cb.equal(v.get("saleStatus"),CatalogPolicy.ON_SALE));
            if(sizeValueId!=null) vp.add(cb.equal(v.get("sizeValueId"),sizeValueId));
            if(colorId!=null) vp.add(cb.equal(v.get("colorId"),colorId));
            if(minPrice!=null) vp.add(cb.or(
                    cb.and(cb.isNotNull(v.get("overridePrice")),cb.greaterThanOrEqualTo(v.<BigDecimal>get("overridePrice"),minPrice)),
                    cb.and(cb.isNull(v.get("overridePrice")),cb.greaterThanOrEqualTo(root.<BigDecimal>get("basePrice"),minPrice))));
            if(maxPrice!=null) vp.add(cb.or(
                    cb.and(cb.isNotNull(v.get("overridePrice")),cb.lessThanOrEqualTo(v.<BigDecimal>get("overridePrice"),maxPrice)),
                    cb.and(cb.isNull(v.get("overridePrice")),cb.lessThanOrEqualTo(root.<BigDecimal>get("basePrice"),maxPrice))));
            sq.select(v.<Long>get("variantId")).where(vp.toArray(Predicate[]::new));
            predicates.add(cb.exists(sq));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private Pagination pagination(Integer page,Integer pageSize) {
        try{return Pagination.of(page,pageSize);}
        catch(IllegalArgumentException ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
    }
    private Product product(Long id){return products.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Category category(Long id){return categories.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Brand brand(Long id){return brands.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private SizeSystem sizeSystem(Long id){return sizeSystems.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private SizeValue sizeValue(Long id){return sizeValues.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Color color(Long id){return colors.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private BrandDto brandDto(Long id){return id==null?null:CatalogMapper.brand(brand(id));}
    private Map<Long,Category> categoryMap(){var m=new HashMap<Long,Category>();categories.findAllByOrderByCategoryIdAsc().forEach(c->m.put(c.getCategoryId(),c));return m;}
    private Map<Long,Brand> brandMap(){var m=new HashMap<Long,Brand>();brands.findAllByOrderByBrandIdAsc().forEach(b->m.put(b.getBrandId(),b));return m;}
    private Category requiredCategory(Map<Long,Category> map,Long id){var v=map.get(id);if(v==null)throw new IllegalStateException("Missing category");return v;}
    private Brand requiredBrand(Map<Long,Brand> map,Long id){var v=map.get(id);if(v==null)throw new IllegalStateException("Missing brand");return v;}
}
