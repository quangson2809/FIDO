package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RoleRepository;

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

    public AccountUserDetailsService(
            AccountRepository accounts,
            RoleRepository roles,
            PermissionRepository permissions,
            PhoneNumberCanonicalizer phones) {
        this.accounts = accounts;
        this.roles = roles;
        this.permissions = permissions;
        this.phones = phones;
    }

    @Override
    public AccountPrincipal loadUserByUsername(String phone) {
        var matches = accounts.findByPhoneInAndNotDeleted(phones.lookupValues(phone));
        if (matches.size() != 1) throw missingAccount();
        return principal(matches.get(0));
    }

    /** JWT dùng accountId, không dùng số điện thoại; luôn đọc lại quyền và trạng thái hiện tại. */
    public AccountPrincipal loadByAccountId(Long accountId) {
        return accounts.findById(accountId)
                .filter(account -> account.getDeletedAt() == null)
                .map(this::principal)
                .orElseThrow(AccountUserDetailsService::missingAccount);
    }

    private AccountPrincipal principal(Account account) {
        String[] authorities =
                Stream.concat(
                                roles.findAssignedToAccount(account.getAccountId()).stream()
                                        .map(role -> "ROLE_" + role.getCode()),
                                permissions.findGrantedToAccount(account.getAccountId()).stream()
                                        .map(permission -> "PERMISSION_" + permission.getCode()))
                        .distinct()
                        .toArray(String[]::new);
        return new AccountPrincipal(account, AuthorityUtils.createAuthorityList(authorities));
    }

    private static UsernameNotFoundException missingAccount() {
        return new UsernameNotFoundException("Không tìm thấy tài khoản duy nhất đang sử dụng.");
    }
}
