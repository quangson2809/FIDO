package com.fido.modules.account.service;

import com.fido.modules.account.entity.*;
import com.fido.modules.account.repository.*;
import com.fido.modules.audit.service.AuditService;
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
    public SuperadminBootstrapService(RoleRepository roles,AccountRepository accounts,AccountRoleRepository assignments,
        AuthenticationService authentication,AccountAccessService access,AuditService audit) {
        this.roles=roles;this.accounts=accounts;this.assignments=assignments;
        this.authentication=authentication;this.access=access;this.audit=audit;
    }
    @Transactional
    public void initialize(String phone,String password) {
        if(phone==null || phone.isBlank() || phone.length()>20 || password==null || password.isBlank())
            throw new IllegalStateException("Bootstrap requires phone and password from configuration");
        Role role=roles.lockAdministration().orElseThrow();
        var existing=accounts.findByPhone(phone);
        if(existing.isPresent()) {
            if(!access.isAdministrator(existing.get().getAccountId()))
                throw new IllegalStateException("Bootstrap phone already belongs to a non-superadmin account");
            return; // Never reset passwords or silently elevate an existing account.
        }
        if(assignments.existsByRoleId(role.getRoleId())) return;
        Account account=new Account();account.setPhone(phone);account.setPasswordHash(authentication.hashPassword(password));
        accounts.save(account);
        AccountRole mapping=new AccountRole();mapping.setAccountId(account.getAccountId());mapping.setRoleId(role.getRoleId());assignments.save(mapping);
        audit.record(account.getAccountId(),"SUPERADMIN_BOOTSTRAP","ACCOUNT",account.getAccountId());
    }
}
