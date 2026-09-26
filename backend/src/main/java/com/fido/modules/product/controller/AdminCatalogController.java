package com.fido.modules.product.controller;

import com.fido.common.response.*;
import com.fido.modules.product.dto.request.*;
import com.fido.modules.product.dto.response.*;
import com.fido.modules.product.service.*;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminCatalogController {
    private final CatalogQueryService query;
    private final CatalogAdminService admin;
    public AdminCatalogController(CatalogQueryService query,CatalogAdminService admin){this.query=query;this.admin=admin;}
    private Long actor(Jwt jwt){return Long.valueOf(jwt.getSubject());}

    @GetMapping("/products")
    public ApiListResponse<AdminProductSummaryDto> products(@RequestParam(required=false) String q,
            @RequestParam(name="category_id",required=false) Long categoryId,
            @RequestParam(name="brand_id",required=false) Long brandId,
            @RequestParam(name="size_system_id",required=false) Long sizeSystemId,
            @RequestParam(name="sale_status",required=false) String saleStatus,
            @RequestParam(required=false) Integer page,@RequestParam(name="page_size",required=false) Integer pageSize) {
        return query.adminProducts(q,categoryId,brandId,sizeSystemId,saleStatus,page,pageSize);
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> product(@PathVariable Long productId){
        return ApiResponse.of(query.adminDetail(productId));
    }

    @PostMapping("/products") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminProductDetailDto> createProduct(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProductCreateRequest r){
        return ApiResponse.of(admin.createProduct(actor(jwt),r));
    }

    @PatchMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> updateProduct(@AuthenticationPrincipal Jwt jwt,@PathVariable Long productId,
            @Valid @RequestBody ProductPatchRequest r){
        return ApiResponse.of(admin.updateProduct(actor(jwt),productId,r));
    }

    @PostMapping("/products/{productId}/variants") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<List<AdminVariantDto>> createVariants(@AuthenticationPrincipal Jwt jwt,@PathVariable Long productId,
            @Valid @RequestBody VariantBatchCreateRequest r){
        return ApiResponse.of(admin.createVariants(actor(jwt),productId,r));
    }

    @PatchMapping("/products/{productId}/variants/{variantId}")
    public ApiResponse<AdminVariantDto> updateVariant(@AuthenticationPrincipal Jwt jwt,@PathVariable Long productId,
            @PathVariable Long variantId,@Valid @RequestBody VariantPatchRequest r){
        return ApiResponse.of(admin.updateVariant(actor(jwt),productId,variantId,r));
    }

    @GetMapping("/catalog/meta")
    public ApiResponse<CatalogMetaDto> meta(){return ApiResponse.of(query.adminMeta());}

    @PostMapping("/categories") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryDto> category(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody CategoryCreateRequest r){
        return ApiResponse.of(admin.createCategory(actor(jwt),r));
    }
    @PatchMapping("/categories/{categoryId}")
    public ApiResponse<CategoryDto> category(@AuthenticationPrincipal Jwt jwt,@PathVariable Long categoryId,
            @Valid @RequestBody CategoryPatchRequest r){
        return ApiResponse.of(admin.updateCategory(actor(jwt),categoryId,r));
    }
    @DeleteMapping("/categories/{categoryId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@AuthenticationPrincipal Jwt jwt,@PathVariable Long categoryId){
        admin.deleteCategory(actor(jwt),categoryId);
    }

    @PostMapping("/brands") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BrandDto> brand(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody BrandRequest r){
        return ApiResponse.of(admin.createBrand(actor(jwt),r));
    }
    @PatchMapping("/brands/{brandId}")
    public ApiResponse<BrandDto> brand(@AuthenticationPrincipal Jwt jwt,@PathVariable Long brandId,
            @Valid @RequestBody BrandRequest r){
        return ApiResponse.of(admin.updateBrand(actor(jwt),brandId,r));
    }
    @DeleteMapping("/brands/{brandId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBrand(@AuthenticationPrincipal Jwt jwt,@PathVariable Long brandId){
        admin.deleteBrand(actor(jwt),brandId);
    }

    @PostMapping("/size-systems") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SizeSystemDto> sizeSystem(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody SizeSystemCreateRequest r){
        return ApiResponse.of(admin.createSizeSystem(actor(jwt),r));
    }
    @PatchMapping("/size-systems/{sizeSystemId}")
    public ApiResponse<SizeSystemDto> sizeSystem(@AuthenticationPrincipal Jwt jwt,@PathVariable Long sizeSystemId,
            @Valid @RequestBody SizeSystemPatchRequest r){
        return ApiResponse.of(admin.updateSizeSystem(actor(jwt),sizeSystemId,r));
    }
    @DeleteMapping("/size-systems/{sizeSystemId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSizeSystem(@AuthenticationPrincipal Jwt jwt,@PathVariable Long sizeSystemId){
        admin.deleteSizeSystem(actor(jwt),sizeSystemId);
    }

    @PostMapping("/colors") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ColorDto> color(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ColorCreateRequest r){
        return ApiResponse.of(admin.createColor(actor(jwt),r));
    }
    @PatchMapping("/colors/{colorId}")
    public ApiResponse<ColorDto> color(@AuthenticationPrincipal Jwt jwt,@PathVariable Long colorId,
            @Valid @RequestBody ColorPatchRequest r){
        return ApiResponse.of(admin.updateColor(actor(jwt),colorId,r));
    }
    @DeleteMapping("/colors/{colorId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteColor(@AuthenticationPrincipal Jwt jwt,@PathVariable Long colorId){
        admin.deleteColor(actor(jwt),colorId);
    }
}
