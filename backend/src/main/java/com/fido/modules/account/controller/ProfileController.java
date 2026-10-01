package com.fido.modules.account.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.request.AddressRequest;
import com.fido.modules.account.dto.request.ProfilePatch;
import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.AddressDto;
import com.fido.modules.account.dto.response.MeDto;
import com.fido.modules.account.service.ProfileCommandService;
import com.fido.modules.account.service.ProfileQueryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {

    private final ProfileCommandService service;
    private final ProfileQueryService query;

    public ProfileController(ProfileCommandService service, ProfileQueryService query) {
        this.service = service;
        this.query = query;
    }

    @GetMapping
    public ApiResponse<MeDto> me(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.of(
                query.me(Long.valueOf(jwt.getSubject()))
        );
    }

    @PatchMapping
    public ApiResponse<AccountDto> update(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ProfilePatch request
    ) {
        return ApiResponse.of(
                service.update(
                        Long.valueOf(jwt.getSubject()),
                        request
                )
        );
    }

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AddressDto> add(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddressRequest request
    ) {
        return ApiResponse.of(
                service.addAddress(
                        Long.valueOf(jwt.getSubject()),
                        request
                )
        );
    }

    @PatchMapping("/addresses/{addressId}")
    public ApiResponse<AddressDto> updateAddress(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long addressId,
            @Valid @RequestBody AddressRequest request
    ) {
        return ApiResponse.of(
                service.updateAddress(
                        Long.valueOf(jwt.getSubject()),
                        addressId,
                        request
                )
        );
    }

    @DeleteMapping("/addresses/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long addressId
    ) {
        service.deleteAddress(
                Long.valueOf(jwt.getSubject()),
                addressId
        );
    }
}
