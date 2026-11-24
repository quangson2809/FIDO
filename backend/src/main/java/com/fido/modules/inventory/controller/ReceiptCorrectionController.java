package com.fido.modules.inventory.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.inventory.dto.request.ReceiptCorrectionRequest;
import com.fido.modules.inventory.dto.response.ReceiptCorrectionDto;
import com.fido.modules.inventory.service.ReceiptCorrectionService;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/goods-receipts/{receiptId}/corrections")
public class ReceiptCorrectionController {
    private final ReceiptCorrectionService service;

    public ReceiptCorrectionController(ReceiptCorrectionService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<ReceiptCorrectionDto>> list(@PathVariable long receiptId) {
        return ApiResponse.of(service.list(receiptId));
    }

    @PostMapping
    public ApiResponse<ReceiptCorrectionDto> correct(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long receiptId,
            @Valid @RequestBody ReceiptCorrectionRequest request) {
        return ApiResponse.of(
                service.correct(Long.parseLong(jwt.getSubject()), receiptId, request));
    }
}
