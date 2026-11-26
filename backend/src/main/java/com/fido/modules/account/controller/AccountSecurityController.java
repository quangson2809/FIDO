package com.fido.modules.account.controller;

import com.fido.modules.account.service.identity.AccountSecurityService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AccountSecurityController {
    private final AccountSecurityService security;

    public AccountSecurityController(AccountSecurityService security) {
        this.security = security;
    }


    public record PasswordChange(
            @NotNull String email,
            @NotNull @Size(min = 8, max = 128) String password,
            @NotNull @Size(min = 8, max = 128) String confirmPassword) {}

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@Valid @RequestBody PasswordChange request) {
        security.changePassword(
                request.email(), request.password(), request.confirmPassword());
    }

    @PostMapping("/email/send-otp")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void verification(@RequestParam String email) {
        security.verification(email);
    }

    @PostMapping("/auth/email/verify-otp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@RequestParam String email, @RequestParam String otp) {
        security.verify( email, otp);
    }

}
