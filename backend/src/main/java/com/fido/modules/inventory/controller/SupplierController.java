package com.fido.modules.inventory.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.inventory.dto.request.SupplierCreateRequest;
import com.fido.modules.inventory.dto.request.SupplierPatchRequest;
import com.fido.modules.inventory.dto.response.SupplierDto;
import com.fido.modules.inventory.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
@RequestMapping("/api/v1/admin/suppliers")
public class SupplierController {

    private final SupplierService service;

    public SupplierController(SupplierService service) {
        this.service = service;
    }

    @GetMapping
    public ApiListResponse<SupplierDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(name = "usage_status", required = false)
                    String usageStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false)
                    Integer pageSize
    ) {
        return service.list(
                q,
                usageStatus,
                page,
                pageSize
        );
    }

    @GetMapping("/{supplierId}")
    public ApiResponse<SupplierDto> detail(
            @PathVariable Long supplierId
    ) {
        return ApiResponse.of(
                service.detail(supplierId)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SupplierDto> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SupplierCreateRequest request
    ) {
        return ApiResponse.of(
                service.create(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/{supplierId}")
    public ApiResponse<SupplierDto> update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long supplierId,
            @Valid @RequestBody SupplierPatchRequest request
    ) {
        return ApiResponse.of(
                service.update(
                        actor(jwt),
                        supplierId,
                        request
                )
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
