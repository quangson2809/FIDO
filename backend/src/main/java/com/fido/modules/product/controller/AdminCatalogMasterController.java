package com.fido.modules.product.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.request.BrandRequest;
import com.fido.modules.product.dto.request.CategoryCreateRequest;
import com.fido.modules.product.dto.request.CategoryPatchRequest;
import com.fido.modules.product.dto.request.ColorCreateRequest;
import com.fido.modules.product.dto.request.ColorPatchRequest;
import com.fido.modules.product.dto.request.SizeSystemCreateRequest;
import com.fido.modules.product.dto.request.SizeSystemPatchRequest;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.dto.response.ColorDto;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.service.CatalogMasterDataService;
import com.fido.modules.product.service.AdminCatalogQueryService;
import com.fido.modules.product.service.SizeSystemAdminService;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminCatalogMasterController {

    private final AdminCatalogQueryService query;
    private final CatalogMasterDataService masterData;
    private final SizeSystemAdminService sizeSystems;

    public AdminCatalogMasterController(
            AdminCatalogQueryService query,
            CatalogMasterDataService masterData,
            SizeSystemAdminService sizeSystems
    ) {
        this.query = query;
        this.masterData = masterData;
        this.sizeSystems = sizeSystems;
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
                masterData.createCategory(
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
                masterData.updateCategory(
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
        masterData.deleteCategory(
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
                masterData.createBrand(
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
                masterData.updateBrand(
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
        masterData.deleteBrand(
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
                sizeSystems.createSizeSystem(
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
                sizeSystems.updateSizeSystem(
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
        sizeSystems.deleteSizeSystem(
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
                masterData.createColor(
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
                masterData.updateColor(
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
        masterData.deleteColor(
                actor(jwt),
                colorId
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
