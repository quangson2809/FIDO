package com.fido.modules.inventory.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.inventory.dto.request.GoodsReceiptActionRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptCreateRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptPatchRequest;
import com.fido.modules.inventory.dto.response.GoodsReceiptDetailDto;
import com.fido.modules.inventory.dto.response.GoodsReceiptSummaryDto;
import com.fido.modules.inventory.service.GoodsReceiptQueryService;
import com.fido.modules.inventory.service.GoodsReceiptService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
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
@RequestMapping("/api/v1/admin/goods-receipts")
public class GoodsReceiptController {

    private final GoodsReceiptQueryService query;
    private final GoodsReceiptService service;

    public GoodsReceiptController(
            GoodsReceiptQueryService query,
            GoodsReceiptService service
    ) {
        this.query = query;
        this.service = service;
    }

    @GetMapping
    public ApiListResponse<GoodsReceiptSummaryDto> list(
            @RequestParam(name = "receipt_code", required = false)
                    String receiptCode,
            @RequestParam(name = "supplier_id", required = false)
                    Long supplierId,
            @RequestParam(name = "receipt_status", required = false)
                    String receiptStatus,
            @RequestParam(name = "date_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate dateTo,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false)
                    Integer pageSize
    ) {
        return query.list(
                receiptCode,
                supplierId,
                receiptStatus,
                dateFrom,
                dateTo,
                page,
                pageSize
        );
    }

    @GetMapping("/{receiptId}")
    public ApiResponse<GoodsReceiptDetailDto> detail(
            @PathVariable Long receiptId
    ) {
        return ApiResponse.of(
                query.detail(receiptId)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<GoodsReceiptDetailDto> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody GoodsReceiptCreateRequest request
    ) {
        return ApiResponse.of(
                service.create(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/{receiptId}")
    public ApiResponse<GoodsReceiptDetailDto> update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long receiptId,
            @Valid @RequestBody GoodsReceiptPatchRequest request
    ) {
        return ApiResponse.of(
                service.update(
                        actor(jwt),
                        receiptId,
                        request
                )
        );
    }

    @PostMapping("/{receiptId}/actions")
    public ApiResponse<GoodsReceiptDetailDto> action(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long receiptId,
            @Valid @RequestBody GoodsReceiptActionRequest request
    ) {
        return ApiResponse.of(
                service.action(
                        actor(jwt),
                        receiptId,
                        request
                )
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
