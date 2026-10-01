package com.fido.modules.order.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.order.dto.request.CheckoutQuoteRequest;
import com.fido.modules.order.dto.response.CheckoutQuoteDto;
import com.fido.modules.order.service.CheckoutQuoteService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/checkout")
public class CheckoutController {

    private final CheckoutQuoteService service;

    public CheckoutController(
            CheckoutQuoteService service
    ) {
        this.service = service;
    }

    @PostMapping("/quote")
    public ApiResponse<CheckoutQuoteDto> quote(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CheckoutQuoteRequest request
    ) {
        return ApiResponse.of(
                service.quote(
                        Long.valueOf(jwt.getSubject()),
                        request
                )
        );
    }
}
