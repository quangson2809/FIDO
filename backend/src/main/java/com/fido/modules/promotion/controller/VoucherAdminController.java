package com.fido.modules.promotion.controller;
import com.fido.common.response.ApiResponse;
import com.fido.common.response.PaginationMeta;
import com.fido.modules.promotion.dto.request.VoucherRequest;
import com.fido.modules.promotion.dto.response.VoucherDetailDto;
import com.fido.modules.promotion.service.VoucherManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/admin/vouchers")
public class VoucherAdminController {
    private final VoucherManagementService service;
    public VoucherAdminController(VoucherManagementService service) { this.service=service; }
    public record VoucherPage(List<VoucherDetailDto> data,PaginationMeta meta) {}
    @GetMapping
    public VoucherPage list(@RequestParam(defaultValue="") String search,
            @RequestParam(defaultValue="1") @Min(1) int page,
            @RequestParam(defaultValue="20") @Min(1) @Max(100) int page_size) {
        var result=service.list(search,page,page_size);
        return new VoucherPage(result.getContent(),new PaginationMeta(page,page_size,result.getTotalElements(),result.getTotalPages()));
    }
    @GetMapping("/{id}") public ApiResponse<VoucherDetailDto> detail(@PathVariable Long id) { return ApiResponse.of(service.detail(id)); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VoucherDetailDto> create(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody VoucherRequest request) {
        return ApiResponse.of(service.create(Long.valueOf(jwt.getSubject()),request));
    }
    @PutMapping("/{id}")
    public ApiResponse<VoucherDetailDto> update(@AuthenticationPrincipal Jwt jwt,@PathVariable Long id,@Valid @RequestBody VoucherRequest request) {
        return ApiResponse.of(service.update(Long.valueOf(jwt.getSubject()),id,request));
    }
}
