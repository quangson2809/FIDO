package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Account;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

/** Bản sao phục vụ xác thực; Spring xóa credentials mà không làm đổi entity JPA. */
public final class AccountPrincipal extends User {
    private static final long serialVersionUID = 1L;
    private final Long accountId;

    AccountPrincipal(Account account, Collection<? extends GrantedAuthority> authorities) {
        super(
                account.getPhone(),
                account.getPasswordHash(),
                account.isActive(),
                true,
                true,
                !"LOCKED".equals(account.getStatus()),
                authorities);
        this.accountId = account.getAccountId();
    }

    public Long accountId() {
        return accountId;
    }
}
