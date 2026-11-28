package com.fido.modules.account.controller;

import com.fido.modules.account.service.identity.AccountSecurityService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AccountSecurityController {
    private final AccountSecurityService security;

    public AccountSecurityController(AccountSecurityService security) {
        this.security = security;
    }

    public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {}

    public record OtpVerification(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String otp) {}

    public record PasswordChange(
            @NotBlank @Pattern(regexp = "[0-9]{6}") String otp,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotBlank @Size(min = 8, max = 128) String confirm_password) {}

    public record PasswordReset(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String otp,
            @NotBlank @Size(min = 8, max = 128) String password,
            @NotBlank @Size(min = 8, max = 128) String confirm_password) {}

    @PostMapping("/email/send-otp")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void sendOtp(@Valid @RequestBody EmailRequest request) {
        security.sendOtp(request.email());
    }

    @PostMapping("/auth/email/verify-otp")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody OtpVerification request) {
        security.verifyOtp(request.email(), request.otp());
    }

    @PostMapping("/auth/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PasswordReset request) {
        security.resetPassword(
                request.email(),
                request.otp(),
                request.password(),
                request.confirm_password(),
                jwt != null);
    }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void change(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PasswordChange request) {
        security.changePassword(
                Long.parseLong(jwt.getSubject()),
                request.otp(),
                request.password(),
                request.confirm_password());
    }
}
