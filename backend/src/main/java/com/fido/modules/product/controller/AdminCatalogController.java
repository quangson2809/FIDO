package com.fido.modules.product.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
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
import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ColorDto;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.service.CatalogAdminService;
import com.fido.modules.product.service.CatalogQueryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminCatalogController {

    private final CatalogQueryService query;
    private final CatalogAdminService admin;

    public AdminCatalogController(
            CatalogQueryService query,
            CatalogAdminService admin
    ) {
        this.query = query;
        this.admin = admin;
    }

    @GetMapping("/products")
    public ApiListResponse<AdminProductSummaryDto> products(
            @RequestParam(required = false) String q,
            @RequestParam(name = "category_id", required = false) Long categoryId,
            @RequestParam(name = "brand_id", required = false) Long brandId,
            @RequestParam(name = "size_system_id", required = false) Long sizeSystemId,
            @RequestParam(name = "sale_status", required = false) String saleStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize
    ) {
        return query.adminProducts(
                q,
                categoryId,
                brandId,
                sizeSystemId,
                saleStatus,
                page,
                pageSize
        );
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> product(
            @PathVariable Long productId
    ) {
        return ApiResponse.of(
                query.adminDetail(productId)
        );
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminProductDetailDto> createProduct(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProductCreateRequest request
    ) {
        return ApiResponse.of(
                admin.createProduct(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> updateProduct(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @Valid @RequestBody ProductPatchRequest request
    ) {
        return ApiResponse.of(
                admin.updateProduct(
                        actor(jwt),
                        productId,
                        request
                )
        );
    }

    @PostMapping("/products/{productId}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<List<AdminVariantDto>> createVariants(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @Valid @RequestBody VariantBatchCreateRequest request
    ) {
        return ApiResponse.of(
                admin.createVariants(
                        actor(jwt),
                        productId,
                        request
                )
        );
    }

    @PatchMapping("/products/{productId}/variants/{variantId}")
    public ApiResponse<AdminVariantDto> updateVariant(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @Valid @RequestBody VariantPatchRequest request
    ) {
        return ApiResponse.of(
                admin.updateVariant(
                        actor(jwt),
                        productId,
                        variantId,
                        request
                )
        );
    }

    @GetMapping("/catalog/meta")
    public ApiResponse<CatalogMetaDto> meta() {
        return ApiResponse.of(
                query.adminMeta()
        );
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryDto> createCategory(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CategoryCreateRequest request
    ) {
        return ApiResponse.of(
                admin.createCategory(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/categories/{categoryId}")
    public ApiResponse<CategoryDto> updateCategory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long categoryId,
            @Valid @RequestBody CategoryPatchRequest request
    ) {
        return ApiResponse.of(
                admin.updateCategory(
                        actor(jwt),
                        categoryId,
                        request
                )
        );
    }

    @DeleteMapping("/categories/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long categoryId
    ) {
        admin.deleteCategory(
                actor(jwt),
                categoryId
        );
    }

    @PostMapping("/brands")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BrandDto> createBrand(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody BrandRequest request
    ) {
        return ApiResponse.of(
                admin.createBrand(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/brands/{brandId}")
    public ApiResponse<BrandDto> updateBrand(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long brandId,
            @Valid @RequestBody BrandRequest request
    ) {
        return ApiResponse.of(
                admin.updateBrand(
                        actor(jwt),
                        brandId,
                        request
                )
        );
    }

    @DeleteMapping("/brands/{brandId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBrand(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long brandId
    ) {
        admin.deleteBrand(
                actor(jwt),
                brandId
        );
    }

    @PostMapping("/size-systems")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SizeSystemDto> createSizeSystem(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SizeSystemCreateRequest request
    ) {
        return ApiResponse.of(
                admin.createSizeSystem(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/size-systems/{sizeSystemId}")
    public ApiResponse<SizeSystemDto> updateSizeSystem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long sizeSystemId,
            @Valid @RequestBody SizeSystemPatchRequest request
    ) {
        return ApiResponse.of(
                admin.updateSizeSystem(
                        actor(jwt),
                        sizeSystemId,
                        request
                )
        );
    }

    @DeleteMapping("/size-systems/{sizeSystemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSizeSystem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long sizeSystemId
    ) {
        admin.deleteSizeSystem(
                actor(jwt),
                sizeSystemId
        );
    }

    @PostMapping("/colors")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ColorDto> createColor(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ColorCreateRequest request
    ) {
        return ApiResponse.of(
                admin.createColor(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/colors/{colorId}")
    public ApiResponse<ColorDto> updateColor(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long colorId,
            @Valid @RequestBody ColorPatchRequest request
    ) {
        return ApiResponse.of(
                admin.updateColor(
                        actor(jwt),
                        colorId,
                        request
                )
        );
    }

    @DeleteMapping("/colors/{colorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteColor(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long colorId
    ) {
        admin.deleteColor(
                actor(jwt),
                colorId
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
