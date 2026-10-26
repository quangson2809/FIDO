package com.fido.modules.product.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.request.ProductImageReorderRequest;
import com.fido.modules.product.dto.request.ProductPatchRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.service.AdminCatalogQueryService;
import com.fido.modules.product.service.ProductAdminService;
import com.fido.modules.product.service.ProductImageAdminService;
import com.fido.modules.product.service.ProductImageUploadService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminProductController {

    private final AdminCatalogQueryService query;
    private final ProductAdminService products;
    private final ProductImageAdminService productImages;
    private final ProductImageUploadService imageUploads;

    public AdminProductController(
            AdminCatalogQueryService query,
            ProductAdminService products,
            ProductImageAdminService productImages,
            ProductImageUploadService imageUploads) {
        this.query = query;
        this.products = products;
        this.productImages = productImages;
        this.imageUploads = imageUploads;
    }

    @GetMapping("/products")
    public ApiListResponse<AdminProductSummaryDto> products(
            @RequestParam(required = false) String q,
            @RequestParam(name = "category_id", required = false) Long categoryId,
            @RequestParam(name = "brand_id", required = false) Long brandId,
            @RequestParam(name = "parent_product_id", required = false) Long parentProductId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        return query.adminProducts(q, categoryId, brandId, parentProductId, status, page, pageSize);
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> product(@PathVariable Long productId) {
        return ApiResponse.of(query.adminDetail(productId));
    }

    @PostMapping(value = "/products", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminProductDetailDto> createProduct(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProductCreateRequest request) {
        return ApiResponse.of(products.createProduct(actor(jwt), request));
    }

    @PatchMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> updateProduct(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @Valid @RequestBody ProductPatchRequest request) {
        return ApiResponse.of(products.updateProduct(actor(jwt), productId, request));
    }

    @DeleteMapping("/products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(@AuthenticationPrincipal Jwt jwt, @PathVariable Long productId) {
        products.deleteProduct(actor(jwt), productId);
    }

    @PostMapping(
            value = "/products/{productId}/images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminProductDetailDto> uploadImages(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @RequestPart("images") MultipartFile[] images) {
        return ApiResponse.of(imageUploads.upload(actor(jwt), productId, images));
    }

    @DeleteMapping("/products/{productId}/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeImage(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @PathVariable Long imageId) {
        productImages.removeImage(actor(jwt), productId, imageId);
    }

    @PatchMapping("/products/{productId}/images")
    public ApiResponse<AdminProductDetailDto> reorderImages(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @Valid @RequestBody ProductImageReorderRequest request) {
        return ApiResponse.of(productImages.reorderImages(actor(jwt), productId, request));
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
