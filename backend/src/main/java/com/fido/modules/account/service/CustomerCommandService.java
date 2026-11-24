package com.fido.modules.account.service;

import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.RoleRepository;
import com.fido.modules.audit.service.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
@Transactional
public class CustomerCommandService {
    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final AuditWriteService audit;

    public CustomerCommandService(
            AccountRepository accounts, RoleRepository roles, AuditWriteService audit) {
        this.accounts = accounts;
        this.roles = roles;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CUSTOMER_WRITE')")
    public AccountDto changeStatus(Long id, String status, String reason) {
        Account account =
                accounts.findByIdForUpdate(id)
                        .filter(a -> a.getDeletedAt() == null)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND"));
        if (accounts.findCustomerById(id).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND");
        var assigned = roles.findAssignedToAccount(id);
        if (assigned.stream()
                .anyMatch(r -> java.util.Set.of("ADMIN", "SUPERADMIN").contains(r.getCode())))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "PRIVILEGED_ACCOUNT_USE_STAFF_MANAGEMENT");
        if (!java.util.Set.of("ACTIVE", "LOCKED").contains(status)
                || reason == null
                || reason.isBlank()
                || reason.length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        if (!java.util.Set.of("ACTIVE", "LOCKED").contains(account.getStatus())
                || account.getStatus().equals(status))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ACCOUNT_STATE_CONFLICT");
        String before = account.getStatus();
        account.setStatus(status);
        account.revokeAccessTokens();
        accounts.saveAndFlush(account);
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.CUSTOMER_STATUS_CHANGE,
                        AuditEntityType.ACCOUNT,
                        id.toString(),
                        Map.of("status", before),
                        Map.of("status", status, "reason", reason)));
        return AccountMapper.account(account);
    }
}
