package com.fido.modules.account.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.account.dto.request.PermissionCreateRequest;
import com.fido.modules.account.dto.request.PermissionPatchRequest;
import com.fido.modules.account.dto.request.RoleCreateRequest;
import com.fido.modules.account.dto.request.RolePatchRequest;
import com.fido.modules.account.dto.response.AccessControlDto;
import com.fido.modules.account.dto.response.PermissionDto;
import com.fido.modules.account.dto.response.RoleDetailDto;
import com.fido.modules.account.service.RbacCommandService;
import com.fido.modules.account.service.RbacQueryService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class RbacController {

    private final RbacCommandService service;
    private final RbacQueryService query;

    public RbacController(RbacCommandService service, RbacQueryService query) {
        this.service = service;
        this.query = query;
    }

    @GetMapping("/access-control")
    public ApiResponse<AccessControlDto> accessControl() {
        return ApiResponse.of(query.accessControl());
    }

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionDto>> permissions() {
        return ApiResponse.of(query.permissions());
    }

    @PostMapping("/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RoleDetailDto> role(@Valid @RequestBody RoleCreateRequest request) {
        return ApiResponse.of(service.createRole(request));
    }

    @PatchMapping("/roles/{roleId}")
    public ApiResponse<RoleDetailDto> updateRole(
            @PathVariable Long roleId, @Valid @RequestBody RolePatchRequest request) {
        return ApiResponse.of(service.updateRole(roleId, request));
    }

    @DeleteMapping("/roles/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@PathVariable Long roleId) {
        service.deleteRole(roleId);
    }

    @PostMapping("/permissions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PermissionDto> permission(
            @Valid @RequestBody PermissionCreateRequest request) {
        return ApiResponse.of(service.createPermission(request));
    }

    @PatchMapping("/permissions/{permissionId}")
    public ApiResponse<PermissionDto> updatePermission(
            @PathVariable Long permissionId, @Valid @RequestBody PermissionPatchRequest request) {
        return ApiResponse.of(service.updatePermission(permissionId, request));
    }

    @DeleteMapping("/permissions/{permissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermission(@PathVariable Long permissionId) {
        service.deletePermission(permissionId);
    }
}
