package com.fido.modules.account.dto.response;
import java.util.List;
public record AccessControlDto(List<RoleDetailDto> roles, List<PermissionDto> permissions) {}
