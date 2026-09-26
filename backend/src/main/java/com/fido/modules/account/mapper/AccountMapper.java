package com.fido.modules.account.mapper;

import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.PermissionDto;
import com.fido.modules.account.dto.response.RoleDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.Permission;
import com.fido.modules.account.entity.Role;

public final class AccountMapper {

    private AccountMapper() {
    }

    public static AccountDto account(Account value) {
        return new AccountDto(
                value.getAccountId(),
                value.getPhone(),
                value.getEmail(),
                value.getCreatedAt(),
                value.getUpdatedAt()
        );
    }

    public static RoleDto role(Role value) {
        return new RoleDto(
                value.getRoleId(),
                value.getCode(),
                value.getName(),
                value.getDescription()
        );
    }

    public static PermissionDto permission(Permission value) {
        return new PermissionDto(
                value.getPermissionId(),
                value.getCode(),
                value.getName()
        );
    }
}
