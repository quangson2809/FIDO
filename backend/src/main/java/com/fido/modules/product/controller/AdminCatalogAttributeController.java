package com.fido.modules.product.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.request.AttributeCreateRequest;
import com.fido.modules.product.dto.request.AttributeOptionCreateRequest;
import com.fido.modules.product.dto.request.AttributeOptionPatchRequest;
import com.fido.modules.product.dto.request.AttributePatchRequest;
import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.AttributeOptionDto;
import com.fido.modules.product.service.AttributeCatalogService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/catalog/attributes")
public class AdminCatalogAttributeController {
    private final AttributeCatalogService service;

    public AdminCatalogAttributeController(AttributeCatalogService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AttributeDto> createAttribute(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AttributeCreateRequest request) {
        return ApiResponse.of(service.createAttribute(actor(jwt), request));
    }

    @PatchMapping("/{attributeId}")
    public ApiResponse<AttributeDto> updateAttribute(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long attributeId,
            @Valid @RequestBody AttributePatchRequest request) {
        return ApiResponse.of(service.updateAttribute(actor(jwt), attributeId, request));
    }

    @PostMapping("/{attributeId}/options")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AttributeOptionDto> createOption(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long attributeId,
            @Valid @RequestBody AttributeOptionCreateRequest request) {
        return ApiResponse.of(service.createOption(actor(jwt), attributeId, request));
    }

    @PatchMapping("/{attributeId}/options/{optionId}")
    public ApiResponse<AttributeOptionDto> updateOption(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long attributeId,
            @PathVariable Long optionId,
            @Valid @RequestBody AttributeOptionPatchRequest request) {
        return ApiResponse.of(service.updateOption(actor(jwt), attributeId, optionId, request));
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
