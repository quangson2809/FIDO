package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RoleRepository;

import jakarta.persistence.EntityManager;

import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Stream;

/** Chỉ nối dữ liệu tài khoản/quyền với Spring; provider đảm nhiệm xác thực mật khẩu. */
@Service
@Transactional(readOnly = true)
public class AccountUserDetailsService implements UserDetailsService {
    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final PhoneNumberCanonicalizer phones;
    private final EntityManager entityManager;

    public AccountUserDetailsService(
            AccountRepository accounts,
            RoleRepository roles,
            PermissionRepository permissions,
            PhoneNumberCanonicalizer phones,
            EntityManager entityManager) {
        this.accounts = accounts;
        this.roles = roles;
        this.permissions = permissions;
        this.phones = phones;
        this.entityManager = entityManager;
    }

    @Override
    public Account loadUserByUsername(String phone) {
        var matches = accounts.findByPhoneInAndNotDeleted(phones.lookupValues(phone));
        if (matches.size() != 1) throw missingAccount();
        return principal(matches.get(0));
    }

    /** JWT dùng accountId, không dùng số điện thoại; luôn đọc lại quyền và trạng thái hiện tại. */
    public Account loadByAccountId(Long accountId) {
        return accounts.findById(accountId)
                .filter(account -> account.getDeletedAt() == null)
                .map(this::principal)
                .orElseThrow(AccountUserDetailsService::missingAccount);
    }

    private Account principal(Account account) {
        String[] authorities =
                Stream.concat(
                                roles.findAssignedToAccount(account.getAccountId()).stream()
                                        .map(role -> "ROLE_" + role.getCode()),
                                permissions.findGrantedToAccount(account.getAccountId()).stream()
                                        .map(permission -> "PERMISSION_" + permission.getCode()))
                        .distinct()
                        .toArray(String[]::new);
        // Spring xóa credentials sau xác thực; tách entity trước để không ghi thay đổi vào DB.
        entityManager.detach(account);
        account.setAuthorities(AuthorityUtils.createAuthorityList(authorities));
        return account;
    }

    private static UsernameNotFoundException missingAccount() {
        return new UsernameNotFoundException("Không tìm thấy tài khoản duy nhất đang sử dụng.");
    }
}
