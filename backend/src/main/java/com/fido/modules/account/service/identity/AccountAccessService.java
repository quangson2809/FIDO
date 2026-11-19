package com.fido.modules.account.service.identity;

import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RoleRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Nhận ID từ danh tính đã xác thực; dữ liệu màn quản trị dùng findAccess. */
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

    /** Cho phép quản trị xem tài khoản bị khóa nhưng luôn loại tài khoản đã xóa mềm. */
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

    /** Dữ liệu hồ sơ chỉ trả cho tài khoản còn hoạt động. */
    public Optional<StaffAccountDetailDto> findActiveAccess(Long accountId) {
        return findAccess(accountId).filter(detail -> "ACTIVE".equals(detail.account().status()));
    }

    public boolean isSuperadmin(Long accountId) {
        if (accountId == null) {
            return false;
        }

        return roles.existsAssignedToAccountByCode(accountId, "SUPERADMIN");
    }
}
