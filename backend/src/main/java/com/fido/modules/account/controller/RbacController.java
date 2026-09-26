package com.fido.modules.account.controller;
import com.fido.common.response.*;
import com.fido.modules.account.dto.request.*;
import com.fido.modules.account.dto.response.*;
import com.fido.modules.account.service.RbacService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class RbacController {
    private final RbacService service;
    public RbacController(RbacService service) {this.service=service;}
    @GetMapping("/access-control") public ApiResponse<AccessControlDto> accessControl() {return ApiResponse.of(service.accessControl());}
    @GetMapping("/permissions") public ApiListResponse<PermissionDto> permissions(
        @RequestParam(required=false) Integer page,@RequestParam(name="page_size",required=false) Integer pageSize) {
        return service.permissions(page,pageSize);
    }
    @PostMapping("/roles") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RoleDetailDto> role(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody RoleCreateRequest request) {
        return ApiResponse.of(service.createRole(Long.valueOf(jwt.getSubject()),request));
    }
    @PatchMapping("/roles/{roleId}") public ApiResponse<RoleDetailDto> updateRole(@AuthenticationPrincipal Jwt jwt,
        @PathVariable Long roleId,@Valid @RequestBody RolePatchRequest request) {
        return ApiResponse.of(service.updateRole(Long.valueOf(jwt.getSubject()),roleId,request));
    }
    @DeleteMapping("/roles/{roleId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRole(@AuthenticationPrincipal Jwt jwt,@PathVariable Long roleId) {service.deleteRole(Long.valueOf(jwt.getSubject()),roleId);}
    @PostMapping("/permissions") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PermissionDto> permission(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody PermissionCreateRequest request) {
        return ApiResponse.of(service.createPermission(Long.valueOf(jwt.getSubject()),request));
    }
    @PatchMapping("/permissions/{permissionId}") public ApiResponse<PermissionDto> updatePermission(@AuthenticationPrincipal Jwt jwt,
        @PathVariable Long permissionId,@Valid @RequestBody PermissionPatchRequest request) {
        return ApiResponse.of(service.updatePermission(Long.valueOf(jwt.getSubject()),permissionId,request));
    }
    @DeleteMapping("/permissions/{permissionId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePermission(@AuthenticationPrincipal Jwt jwt,@PathVariable Long permissionId) {service.deletePermission(Long.valueOf(jwt.getSubject()),permissionId);}
}
