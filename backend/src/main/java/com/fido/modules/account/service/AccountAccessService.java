package com.fido.modules.account.service;

import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RoleRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Internal read contract. Callers must supply the authenticated account ID, never a request actor
 * ID. Security must use findActiveAccess; administration can inspect locked accounts via findAccess.
 */
@Service
@Transactional(readOnly = true)
public class AccountAccessService {

    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final PermissionRepository permissions;

    public AccountAccessService(
            AccountRepository accounts, RoleRepository roles, PermissionRepository permissions) {
        this.accounts = accounts;
        this.roles = roles;
        this.permissions = permissions;
    }

    /** Includes lifecycle status for administrative views, but never exposes soft-deleted accounts. */
    public Optional<StaffAccountDetailDto> findAccess(Long accountId) {
        if (accountId == null) {
            return Optional.empty();
        }

        return accounts.findById(accountId)
                .filter(account -> account.getDeletedAt() == null)
                .map(
                        account -> {
                            var roleDtos =
                                    roles.findAssignedToAccount(accountId).stream()
                                            .map(AccountMapper::role)
                                            .toList();

                            var permissionDtos =
                                    permissions.findGrantedToAccount(accountId).stream()
                                            .map(AccountMapper::permission)
                                            .toList();

                            return new StaffAccountDetailDto(
                                    AccountMapper.account(account), roleDtos, permissionDtos);
                        });
    }

    /** Principal resolution uses this method; every protected request rechecks current DB state. */
    public Optional<StaffAccountDetailDto> findActiveAccess(Long accountId) {
        return findAccess(accountId)
                .filter(detail -> "ACTIVE".equals(detail.account().status()));
    }

    public boolean isSuperadmin(Long accountId) {
        if (accountId == null) {
            return false;
        }

        return roles.existsAssignedToAccountByCode(accountId, "SUPERADMIN");
    }
}
