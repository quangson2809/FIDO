package com.fido.modules.account.controller;
import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.request.*;
import com.fido.modules.account.dto.response.*;
import com.fido.modules.account.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {
    private final ProfileService service;
    public ProfileController(ProfileService service) {this.service=service;}
    @GetMapping public ApiResponse<MeDto> me(@AuthenticationPrincipal Jwt jwt) {return ApiResponse.of(service.me(Long.valueOf(jwt.getSubject())));}
    @PatchMapping public ApiResponse<AccountDto> update(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ProfilePatch request) {
        return ApiResponse.of(service.update(Long.valueOf(jwt.getSubject()),request));
    }
    @PostMapping("/addresses") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AddressDto> add(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody AddressRequest request) {
        return ApiResponse.of(service.addAddress(Long.valueOf(jwt.getSubject()),request));
    }
    @PatchMapping("/addresses/{addressId}")
    public ApiResponse<AddressDto> updateAddress(@AuthenticationPrincipal Jwt jwt,@PathVariable Long addressId,@Valid @RequestBody AddressRequest request) {
        return ApiResponse.of(service.updateAddress(Long.valueOf(jwt.getSubject()),addressId,request));
    }
    @DeleteMapping("/addresses/{addressId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt,@PathVariable Long addressId) {service.deleteAddress(Long.valueOf(jwt.getSubject()),addressId);}
}
