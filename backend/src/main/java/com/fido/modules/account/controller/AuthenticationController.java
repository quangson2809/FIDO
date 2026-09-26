package com.fido.modules.account.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.request.LoginRequest;
import com.fido.modules.account.dto.request.RegisterRequest;
import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.LoginResponse;
import com.fido.modules.account.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private final AuthenticationService service;

    public AuthenticationController(AuthenticationService service) {
        this.service = service;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AccountDto> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ApiResponse.of(service.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ApiResponse.of(service.login(request));
    }
}
