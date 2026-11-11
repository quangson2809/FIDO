package com.fido.modules.order.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.dto.response.OrderConfirmationDto;
import com.fido.modules.order.service.OrderCreationService;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderCreationController {

    private final OrderCreationService service;

    public OrderCreationController(OrderCreationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderConfirmationDto>> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(value = "Idempotency-Key", required = false) List<String> idempotencyKeys,
            @Valid @RequestBody CreateOrderRequest request) {
        OrderCreationService.OrderCreationResult result = service.createWithIdempotencyKey(
                Long.valueOf(jwt.getSubject()), request, idempotencyKeys);

        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/v1/me/orders/" + result.orderId()));
        if (result.replayed()) {
            response.header("Idempotency-Replayed", "true");
        }
        return response.body(ApiResponse.of(result.body()));
    }
}
