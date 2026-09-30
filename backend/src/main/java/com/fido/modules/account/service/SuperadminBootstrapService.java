package com.fido.modules.account.service;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AccountRoleRepository;
import com.fido.modules.account.repository.RoleRepository;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperadminBootstrapService {

    private final RoleRepository roles;
    private final AccountRepository accounts;
    private final AccountRoleRepository assignments;
    private final AuthenticationService authentication;
    private final AccountAccessService access;
    private final AuditService audit;

    public SuperadminBootstrapService(
            RoleRepository roles,
            AccountRepository accounts,
            AccountRoleRepository assignments,
            AuthenticationService authentication,
            AccountAccessService access,
            AuditService audit
    ) {
        this.roles = roles;
        this.accounts = accounts;
        this.assignments = assignments;
        this.authentication = authentication;
        this.access = access;
        this.audit = audit;
    }

    @Transactional
    public void initialize(
            String phone,
            String password
    ) {
        if (phone == null
                || phone.isBlank()
                || phone.length() > 20
                || password == null
                || password.isBlank()) {
            throw new IllegalStateException(
                    "Bootstrap requires phone and password from configuration"
            );
        }

        Role role = roles.lockSuperadminRole()
                .orElseThrow();

        var existing = accounts.findByPhone(phone);

        if (existing.isPresent()) {
            if (!access.isSuperadmin(existing.get().getAccountId())) {
                throw new IllegalStateException(
                        "Bootstrap phone already belongs to a non-superadmin account"
                );
            }

            // Never reset passwords or silently elevate an existing account.
            return;
        }

        if (assignments.existsByRoleId(role.getRoleId())) {
            return;
        }

        Account account = new Account();
        account.setPhone(phone);
        account.setPasswordHash(
                authentication.hashPassword(password)
        );

        accounts.save(account);

        AccountRole mapping = new AccountRole();
        mapping.setAccountId(account.getAccountId());
        mapping.setRoleId(role.getRoleId());

        assignments.save(mapping);

        audit.record(
                AuditEvent.of(
                        account.getAccountId(),
                        AuditAction.SUPERADMIN_BOOTSTRAP,
                        AuditTargetType.ACCOUNT,
                        account.getAccountId()
                )
        );
    }
}
