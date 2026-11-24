package com.fido.modules.order.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.order.dto.request.ReturnReceiptRequest;
import com.fido.modules.order.dto.response.ReturnReceiptDto;
import com.fido.modules.order.service.lifecycle.ReturnReceiptService;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/orders/{orderId}/return-receipts")
public class ReturnReceiptController {
    private final ReturnReceiptService receipts;

    public ReturnReceiptController(ReturnReceiptService receipts) {
        this.receipts = receipts;
    }

    @GetMapping
    public ApiResponse<List<ReturnReceiptDto>> list(@PathVariable long orderId) {
        return ApiResponse.of(receipts.list(orderId));
    }

    @PostMapping
    public ApiResponse<ReturnReceiptDto> receive(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long orderId,
            @Valid @RequestBody ReturnReceiptRequest request) {
        return ApiResponse.of(receipts.receive(Long.parseLong(jwt.getSubject()), orderId, request));
    }
}
