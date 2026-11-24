package com.fido.modules.inventory.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.inventory.dto.request.StocktakeRequest;
import com.fido.modules.inventory.dto.response.StocktakeDto;
import com.fido.modules.inventory.service.StocktakeService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/stocktakes")
public class StocktakeController {
    private final StocktakeService service;

    public StocktakeController(StocktakeService service) {
        this.service = service;
    }

    public record Action(@NotBlank String action) {}

    @GetMapping
    public ApiResponse<List<StocktakeDto>> list() {
        return ApiResponse.of(service.list());
    }

    @PostMapping
    public ApiResponse<StocktakeDto> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody StocktakeRequest request) {
        return ApiResponse.of(service.create(Long.parseLong(jwt.getSubject()), request));
    }

    @PostMapping("/{id}/actions")
    public ApiResponse<StocktakeDto> act(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable long id,
            @Valid @RequestBody Action request) {
        return ApiResponse.of(service.act(Long.parseLong(jwt.getSubject()), id, request.action()));
    }
}
