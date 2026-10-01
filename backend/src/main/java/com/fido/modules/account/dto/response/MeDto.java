package com.fido.modules.account.dto.response;
import java.util.List;
public record MeDto(AccountDto account, List<AddressDto> addresses, List<RoleDto> roles, List<PermissionDto> permissions) {}
