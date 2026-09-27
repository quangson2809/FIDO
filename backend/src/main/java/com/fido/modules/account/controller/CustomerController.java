package com.fido.modules.account.controller;
import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.response.CustomerDetailDto;
import com.fido.modules.account.dto.response.CustomerSummaryDto;
import com.fido.modules.account.service.CustomerQueryService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/customers")
public class CustomerController {
    private final CustomerQueryService service;
    public CustomerController(CustomerQueryService service) { this.service = service; }
    @GetMapping
    public ApiListResponse<CustomerSummaryDto> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        return service.list(q, page, pageSize);
    }
    @GetMapping("/{customerId}")
    public ApiResponse<CustomerDetailDto> detail(@PathVariable Long customerId) {
        return ApiResponse.of(service.detail(customerId));
    }
}
