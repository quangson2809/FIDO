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

import java.util.List;

@Service
public class SuperadminBootstrapService {

    private final RoleRepository roles;
    private final AccountRepository accounts;
    private final AccountRoleRepository assignments;
    private final AuthenticationService authentication;
    private final AccountAccessService access;
    private final PhoneNumberCanonicalizer phoneNumbers;
    private final AuditService audit;

    public SuperadminBootstrapService(
            RoleRepository roles,
            AccountRepository accounts,
            AccountRoleRepository assignments,
            AuthenticationService authentication,
            AccountAccessService access,
            PhoneNumberCanonicalizer phoneNumbers,
            AuditService audit) {
        this.roles = roles;
        this.accounts = accounts;
        this.assignments = assignments;
        this.authentication = authentication;
        this.access = access;
        this.phoneNumbers = phoneNumbers;
        this.audit = audit;
    }

    @Transactional
    public void initialize(String phone, String password) {
        if (phone == null
                || phone.isBlank()
                || phone.length() > 40
                || password == null
                || password.isBlank()) {
            throw new IllegalStateException(
                    "Bootstrap requires phone and password from configuration");
        }

        String canonicalPhone = phoneNumbers.canonicalize(phone);
        Role role = roles.lockSuperadminRole().orElseThrow();

        List<Account> matchingAccounts = accounts.findByPhoneInAndNotDeleted(phoneNumbers.lookupValues(canonicalPhone));
        if (matchingAccounts.size() > 1) {
            throw new IllegalStateException("Bootstrap phone matches ambiguous legacy accounts");
        }

        if (!matchingAccounts.isEmpty()) {
            Account existing = matchingAccounts.get(0);
            if (!access.isSuperadmin(existing.getAccountId())) {
                throw new IllegalStateException(
                        "Bootstrap phone already belongs to a non-superadmin account");
            }

            // Never reset passwords or silently elevate an existing account.
            return;
        }

        if (assignments.existsByRoleId(role.getRoleId())) {
            return;
        }

        Account account = new Account();
        account.setFullName("Quản trị hệ thống");
        account.setPhone(canonicalPhone);
        account.setPasswordHash(authentication.hashPassword(password));

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
                        account.getAccountId()));
    }
}
