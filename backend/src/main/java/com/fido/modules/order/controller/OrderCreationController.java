package com.fido.modules.order.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.dto.response.OrderConfirmationDto;
import com.fido.modules.order.service.OrderCreationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderCreationController {

    private final OrderCreationService service;

    public OrderCreationController(
            OrderCreationService service
    ) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrderConfirmationDto> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateOrderRequest request
    ) {
        return ApiResponse.of(
                service.create(
                        Long.valueOf(jwt.getSubject()),
                        request
                )
        );
    }
}
