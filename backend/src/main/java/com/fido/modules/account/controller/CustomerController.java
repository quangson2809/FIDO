package com.fido.modules.account.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.response.CustomerDetailDto;
import com.fido.modules.account.dto.response.CustomerSummaryDto;
import com.fido.modules.account.service.CustomerQueryService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/customers")
public class CustomerController {
    private final CustomerQueryService service;
    private final com.fido.modules.account.service.CustomerCommandService commands;

    public CustomerController(
            CustomerQueryService service,
            com.fido.modules.account.service.CustomerCommandService commands) {
        this.commands = commands;
        this.service = service;
    }

    public record StatusRequest(
            @jakarta.validation.constraints.NotBlank String status,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 500)
                    String reason) {}

    @org.springframework.web.bind.annotation.PatchMapping("/{customerId}/status")
    public ApiResponse<com.fido.modules.account.dto.response.AccountDto> changeStatus(
            @PathVariable Long customerId,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
                    StatusRequest request) {
        return ApiResponse.of(
                commands.changeStatus(customerId, request.status(), request.reason()));
    }

    @GetMapping
    public ApiListResponse<CustomerSummaryDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        return service.list(q, page, pageSize);
    }

    @GetMapping("/{customerId}")
    public ApiResponse<CustomerDetailDto> detail(@PathVariable Long customerId) {
        return ApiResponse.of(service.detail(customerId));
    }
}
