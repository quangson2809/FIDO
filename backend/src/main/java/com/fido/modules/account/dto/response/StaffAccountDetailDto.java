package com.fido.modules.account.dto.response;

import java.util.List;

public record StaffAccountDetailDto(AccountDto account, List<RoleDto> roles,
                                    List<PermissionDto> permissions) {
    public StaffAccountDetailDto {
        roles = List.copyOf(roles);
        permissions = List.copyOf(permissions);
    }
}
