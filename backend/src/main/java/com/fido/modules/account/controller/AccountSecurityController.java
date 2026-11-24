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
            @NotNull @Size(max = 128) String current_password,
            @NotNull @Size(min = 8, max = 128) String new_password) {}

    public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {}

    public record TokenRequest(@NotBlank @Size(max = 43) String token) {}

    public record ResetRequest(
            @NotBlank @Size(max = 43) String token,
            @NotNull @Size(min = 8, max = 128) String new_password) {}

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void change(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PasswordChange request) {
        security.changePassword(
                Long.parseLong(jwt.getSubject()),
                request.current_password(),
                request.new_password());
    }

    @PostMapping("/me/email/verification")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestVerification(@AuthenticationPrincipal Jwt jwt) {
        security.requestVerification(Long.parseLong(jwt.getSubject()));
    }

    @PostMapping("/auth/email/verify")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody TokenRequest request) {
        security.verify(request.token());
    }

    @PostMapping("/auth/password-reset/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestReset(@Valid @RequestBody EmailRequest request) {
        security.requestReset(request.email());
    }

    @PostMapping("/auth/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@Valid @RequestBody ResetRequest request) {
        security.reset(request.token(), request.new_password());
    }
}
