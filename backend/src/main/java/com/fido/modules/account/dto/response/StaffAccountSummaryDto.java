package com.fido.modules.account.dto.response;
import java.util.List;
public record StaffAccountSummaryDto(AccountDto account, List<RoleDto> roles) {}
