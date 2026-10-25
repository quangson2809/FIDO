package com.fido.modules.account.dto.response;

public record RoleDto(
        Long id, String code, String name, String description, String status) {}
