package com.fido.modules.account.controller;
import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.request.*;
import com.fido.modules.account.dto.response.*;
import com.fido.modules.account.service.AuthenticationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {
    private final AuthenticationService service;
    public AuthenticationController(AuthenticationService service) {this.service=service;}
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AccountDto> register(@Valid @RequestBody RegisterRequest request) {return ApiResponse.of(service.register(request));}
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {return ApiResponse.of(service.login(request));}
}
