package com.fido.modules.product.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.request.BrandPatchRequest;
import com.fido.modules.product.dto.request.BrandRequest;
import com.fido.modules.product.dto.request.CategoryCreateRequest;
import com.fido.modules.product.dto.request.CategoryPatchRequest;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.service.AdminCatalogQueryService;
import com.fido.modules.product.service.CatalogMasterDataService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
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

    public AdminCatalogMasterController(
            AdminCatalogQueryService query, CatalogMasterDataService masterData) {
        this.query = query;
        this.masterData = masterData;
    }

    @GetMapping("/catalog/meta")
    public ApiResponse<AdminCatalogMetaDtoV2> meta() {
        return ApiResponse.of(query.adminMeta());
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryDto> createCategory(
            @Valid @RequestBody CategoryCreateRequest request) {
        return ApiResponse.of(masterData.createCategory(request));
    }

    @PatchMapping("/categories/{categoryId}")
    public ApiResponse<CategoryDto> updateCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody CategoryPatchRequest request) {
        return ApiResponse.of(masterData.updateCategory(categoryId, request));
    }

    @DeleteMapping("/categories/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long categoryId) {
        masterData.deleteCategory(categoryId);
    }

    @PostMapping("/brands")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BrandDto> createBrand(
            @Valid @RequestBody BrandRequest request) {
        return ApiResponse.of(masterData.createBrand(request));
    }

    @PatchMapping("/brands/{brandId}")
    public ApiResponse<BrandDto> updateBrand(
            @PathVariable Long brandId,
            @Valid @RequestBody BrandPatchRequest request) {
        return ApiResponse.of(masterData.updateBrand(brandId, request));
    }

    @DeleteMapping("/brands/{brandId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBrand(@PathVariable Long brandId) {
        masterData.deleteBrand(brandId);
    }

}
