package com.fido.modules.account.mapper;

import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.AddressDto;
import com.fido.modules.account.dto.response.PermissionDto;
import com.fido.modules.account.dto.response.RoleDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.Address;
import com.fido.modules.account.entity.Permission;
import com.fido.modules.account.entity.Role;

public final class AccountMapper {

    private AccountMapper() {}

    public static AccountDto account(Account value) {
        return new AccountDto(
                value.getAccountId(),
                value.getFullName(),
                value.getPhone(),
                value.getEmail(),
                value.getStatus(),
                value.getCreatedAt(),
                value.getUpdatedAt(),
                value.getEmailVerifiedAt() != null);
    }

    public static RoleDto role(Role value) {
        return new RoleDto(
                value.getRoleId(),
                value.getCode(),
                value.getName(),
                value.getDescription(),
                value.getStatus());
    }

    public static AddressDto address(Address value) {
        return new AddressDto(
                value.getId(),
                value.getRecipientName(),
                value.getRecipientPhone(),
                value.getProvince(),
                value.getDistrict(),
                value.getWard(),
                value.getAddressLine(),
                value.isDefault());
    }

    public static PermissionDto permission(Permission value) {
        return new PermissionDto(
                value.getPermissionId(), value.getCode(), value.getName(), value.getDescription());
    }
}
