package com.fido.modules.account.service;

import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

/** Internal read contract. Callers must supply the authenticated account ID, never a request actor ID. */
@Service
@Transactional(readOnly = true)
public class AccountAccessService {
    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final PermissionRepository permissions;

    public AccountAccessService(AccountRepository accounts, RoleRepository roles,
                                PermissionRepository permissions) {
        this.accounts = accounts;
        this.roles = roles;
        this.permissions = permissions;
    }

    /** Does not classify an account as staff or authorize an HTTP request. */
    public Optional<StaffAccountDetailDto> findAccess(Long accountId) {
        if (accountId == null) return Optional.empty();
        return accounts.findById(accountId).map(account -> new StaffAccountDetailDto(
                AccountMapper.account(account),
                roles.findAssignedToAccount(accountId).stream().map(AccountMapper::role).toList(),
                permissions.findGrantedToAccount(accountId).stream().map(AccountMapper::permission).toList()));
    }

    public boolean isAdministrator(Long accountId) {
        if (accountId == null || accounts.findById(accountId).isEmpty()) return false;
        return roles.findAssignedToAccount(accountId).stream()
                .anyMatch(role -> "SUPERADMIN".equals(role.getCode()));
    }

    /** The caller must use an approved operation-to-permission mapping; no catalog is invented here. */
    public boolean hasPermission(Long accountId, String permissionCode) {
        if (accountId == null || permissionCode == null || permissionCode.isBlank()
                || accounts.findById(accountId).isEmpty()) return false;
        if (roles.findAssignedToAccount(accountId).stream()
                .anyMatch(role -> "SUPERADMIN".equals(role.getCode()))) return true;
        return permissions.findGrantedToAccount(accountId).stream()
                .anyMatch(permission -> permissionCode.equals(permission.getCode()));
    }
}
