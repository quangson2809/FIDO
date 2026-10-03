package com.fido.modules.product.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.request.ProductCreateRequest;
import com.fido.modules.product.dto.request.ProductPatchRequest;
import com.fido.modules.product.dto.request.VariantBatchCreateRequest;
import com.fido.modules.product.dto.request.VariantPatchRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.dto.response.AdminProductSummaryDto;
import com.fido.modules.product.dto.response.AdminVariantDto;
import com.fido.modules.product.service.AdminCatalogQueryService;
import com.fido.modules.product.service.ProductAdminService;
import com.fido.modules.product.service.ProductCreationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
    private final ProductCreationService creation;

    public AdminProductController(
            AdminCatalogQueryService query,
            ProductAdminService products,
            ProductCreationService creation
    ) {
        this.query = query;
        this.products = products;
        this.creation = creation;
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
        return query.adminProducts(q, categoryId, brandId, sizeSystemId, saleStatus, page, pageSize);
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> product(@PathVariable Long productId) {
        return ApiResponse.of(query.adminDetail(productId));
    }

    @PostMapping(value = "/products", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminProductDetailDto> createProduct(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProductCreateRequest request
    ) {
        return ApiResponse.of(products.createProduct(actor(jwt), request));
    }

    @PostMapping(value = "/products", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AdminProductDetailDto> createProductWithUploads(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestPart("product") ProductCreateRequest request,
            @RequestPart(value = "images", required = false) MultipartFile[] images
    ) {
        return ApiResponse.of(creation.createProduct(actor(jwt), request, images));
    }

    @PatchMapping("/products/{productId}")
    public ApiResponse<AdminProductDetailDto> updateProduct(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @Valid @RequestBody ProductPatchRequest request
    ) {
        return ApiResponse.of(products.updateProduct(actor(jwt), productId, request));
    }

    @PostMapping("/products/{productId}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<List<AdminVariantDto>> createVariants(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @Valid @RequestBody VariantBatchCreateRequest request
    ) {
        return ApiResponse.of(products.createVariants(actor(jwt), productId, request));
    }

    @PatchMapping("/products/{productId}/variants/{variantId}")
    public ApiResponse<AdminVariantDto> updateVariant(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @Valid @RequestBody VariantPatchRequest request
    ) {
        return ApiResponse.of(products.updateVariant(actor(jwt), productId, variantId, request));
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
