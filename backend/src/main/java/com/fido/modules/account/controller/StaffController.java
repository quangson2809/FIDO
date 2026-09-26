package com.fido.modules.account.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.request.StaffCreateRequest;
import com.fido.modules.account.dto.request.StaffPatchRequest;
import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.dto.response.StaffAccountSummaryDto;
import com.fido.modules.account.service.StaffService;
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
@RequestMapping("/api/v1/admin/staff-accounts")
public class StaffController {

    private final StaffService service;

    public StaffController(StaffService service) {
        this.service = service;
    }

    @GetMapping
    public ApiListResponse<StaffAccountSummaryDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(name = "role_id", required = false) Long roleId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize
    ) {
        return service.list(q, roleId, page, pageSize);
    }

    @GetMapping("/{accountId}")
    public ApiResponse<StaffAccountDetailDto> detail(
            @PathVariable Long accountId
    ) {
        return ApiResponse.of(service.detail(accountId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StaffAccountDetailDto> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody StaffCreateRequest request
    ) {
        return ApiResponse.of(
                service.create(
                        Long.valueOf(jwt.getSubject()),
                        request
                )
        );
    }

    @PatchMapping("/{accountId}")
    public ApiResponse<StaffAccountDetailDto> update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long accountId,
            @Valid @RequestBody StaffPatchRequest request
    ) {
        return ApiResponse.of(
                service.update(
                        Long.valueOf(jwt.getSubject()),
                        accountId,
                        request
                )
        );
    }
}
