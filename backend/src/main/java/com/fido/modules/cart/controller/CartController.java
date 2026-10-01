package com.fido.modules.cart.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.cart.dto.request.CartItemCreateRequest;
import com.fido.modules.cart.dto.request.CartItemQuantityRequest;
import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.service.CartCommandService;
import com.fido.modules.cart.service.CartQueryService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/cart")
public class CartController {

    private final CartCommandService service;
    private final CartQueryService query;

    public CartController(CartCommandService service, CartQueryService query) {
        this.service = service;
        this.query = query;
    }

    @GetMapping
    public ApiResponse<CartDto> current(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.of(
                query.current(actor(jwt))
        );
    }

    @PostMapping("/items")
    public ApiResponse<CartDto> add(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CartItemCreateRequest request
    ) {
        return ApiResponse.of(
                service.add(
                        actor(jwt),
                        request
                )
        );
    }

    @PatchMapping("/items/{cartItemId}")
    public ApiResponse<CartDto> updateQuantity(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long cartItemId,
            @Valid @RequestBody CartItemQuantityRequest request
    ) {
        return ApiResponse.of(
                service.updateQuantity(
                        actor(jwt),
                        cartItemId,
                        request
                )
        );
    }

    @DeleteMapping("/items/{cartItemId}")
    public ApiResponse<CartDto> deleteItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long cartItemId
    ) {
        return ApiResponse.of(
                service.deleteItem(
                        actor(jwt),
                        cartItemId
                )
        );
    }

    @DeleteMapping
    public ApiResponse<CartDto> clear(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.of(
                service.clear(actor(jwt))
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
