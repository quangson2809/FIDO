package com.fido.modules.account.dto.response;

import java.util.List;

public record RoleDetailDto(
        Long role_id,
        String code,
        String name,
        String description,
        String status,
        List<PermissionDto> permissions) {}
