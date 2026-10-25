package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.StaffCreateRequest;
import com.fido.modules.account.dto.request.StaffPatchRequest;
import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AccountRoleRepository;
import com.fido.modules.account.repository.RoleRepository;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;

import jakarta.persistence.EntityManager;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class StaffCommandService {

    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final AccountRoleRepository assignments;
    private final AccountAccessService access;
    private final AuthenticationService authentication;
    private final PhoneNumberCanonicalizer phoneNumbers;
    private final AuditWriteService audit;
    private final EntityManager em;

    public StaffCommandService(
            AccountRepository accounts,
            RoleRepository roles,
            AccountRoleRepository assignments,
            AccountAccessService access,
            AuthenticationService authentication,
            PhoneNumberCanonicalizer phoneNumbers,
            AuditWriteService audit,
            EntityManager em) {
        this.accounts = accounts;
        this.roles = roles;
        this.assignments = assignments;
        this.access = access;
        this.authentication = authentication;
        this.phoneNumbers = phoneNumbers;
        this.audit = audit;
        this.em = em;
    }

    public StaffAccountDetailDto create(Long actor, StaffCreateRequest request) {
        lockSuperadminRole();
        String phone = phoneNumbers.canonicalize(request.phone());
        requireCreatePhoneAvailable(phone);

        List<Role> selectedRoles =
                resolveCreateRoles(request.role_ids() == null ? List.of(defaultAdminRoleId()) : request.role_ids());

        Account account = new Account();
        account.setFullName(request.full_name().trim());
        account.setPhone(phone);
        account.setEmail(request.email());
        account.setStatus("ACTIVE");
        account.setPasswordHash(authentication.hashPassword(request.password()));
        account = accounts.save(account);

        replace(account.getAccountId(), selectedRoles);
        em.flush();

        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.STAFF_CREATE,
                        AuditEntityType.ACCOUNT,
                        account.getAccountId().toString(),
                        Map.of(),
                        Map.of("status", "ACTIVE", "active", true, "role_count", selectedRoles.size())));

        return access.findAccess(account.getAccountId()).orElseThrow();
    }

    public StaffAccountDetailDto update(Long actor, Long accountId, StaffPatchRequest request) {
        Role superadminRole = lockSuperadminRole();

        requireStaff(accountId);

        Account account =
                accounts.findByIdForUpdate(accountId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (account.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        int oldRoleCount = access.findAccess(accountId).map(detail -> detail.roles().size()).orElse(0);
        String oldStatus = account.getStatus();
        boolean oldActive = account.isActive();
        List<Role> selectedRoles =
                request.role_ids() == null ? null : resolveCreateRoles(request.role_ids());
        boolean finalSuperadmin =
                selectedRoles == null
                        ? access.isSuperadmin(accountId)
                        : selectedRoles.stream().anyMatch(role -> "SUPERADMIN".equals(role.getCode()));
        String finalStatus = request.status() == null ? account.getStatus() : request.status();

        // The locked SUPERADMIN row serializes role and lifecycle changes, so concurrent updates
        // cannot both observe a count of two and remove both final ACTIVE assignments.
        if (account.isActive()
                && access.isSuperadmin(accountId)
                && (!"ACTIVE".equals(finalStatus) || !finalSuperadmin)
                && assignments.countActiveAccountsByRoleId(superadminRole.getRoleId()) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "LAST_SUPERADMIN_REQUIRED");
        }

        applyAccountPatch(account, request);
        if (selectedRoles != null) {
            replace(accountId, selectedRoles);
        }

        em.flush();
        int newRoleCount = access.findAccess(accountId).map(detail -> detail.roles().size()).orElse(0);
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.STAFF_UPDATE,
                        AuditEntityType.ACCOUNT,
                        accountId.toString(),
                        Map.of("status", oldStatus, "active", oldActive, "role_count", oldRoleCount),
                        Map.of("status", account.getStatus(), "active", account.isActive(), "role_count", newRoleCount)));

        return access.findAccess(accountId).orElseThrow();
    }

    private void requireCreatePhoneAvailable(String canonicalPhone) {
        if (accounts.existsByPhoneInAndNotDeleted(phoneNumbers.lookupValues(canonicalPhone))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private List<Role> resolveCreateRoles(List<Long> requestedRoleIds) {
        List<Role> selectedRoles = resolve(requestedRoleIds);
        requireStaffRole(selectedRoles);
        return selectedRoles;
    }

    private Long defaultAdminRoleId() {
        return roles.findByCode("ADMIN")
                .filter(role -> "ACTIVE".equals(role.getStatus()))
                .orElseThrow(() -> new IllegalStateException("ACTIVE ADMIN role is missing"))
                .getRoleId();
    }

    private void requireStaffRole(List<Role> selectedRoles) {
        boolean hasStaffRole =
                selectedRoles.stream()
                        .anyMatch(role -> Set.of("ADMIN", "SUPERADMIN").contains(role.getCode()));

        if (!hasStaffRole) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    private void applyAccountPatch(Account account, StaffPatchRequest request) {
        if (request.phone() != null) {
            String canonicalPhone = phoneNumbers.canonicalize(request.phone());
            if (accounts.existsByPhoneInAndNotDeletedAndAccountIdNot(
                    phoneNumbers.lookupValues(canonicalPhone), account.getAccountId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
            account.setPhone(canonicalPhone);
        }

        if (request.full_name() != null) {
            account.setFullName(request.full_name().trim());
        }

        if (request.email() != null) {
            account.setEmail(request.email());
        }

        if (request.status() != null) {
            account.setStatus(request.status());
        }
    }

    private void requireStaff(Long accountId) {
        boolean isStaff =
                roles.findAssignedToAccount(accountId).stream()
                        .anyMatch(role -> Set.of("ADMIN", "SUPERADMIN").contains(role.getCode()));

        if (!isStaff) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private List<Role> resolve(List<Long> roleIds) {
        LinkedHashSet<Long> uniqueRoleIds = new LinkedHashSet<>(roleIds);
        if (uniqueRoleIds.size() != roleIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        return uniqueRoleIds.stream()
                .map(
                        roleId ->
                                roles.findById(roleId)
                                        .filter(role -> "ACTIVE".equals(role.getStatus()))
                                        .orElseThrow(
                                                () -> new ResponseStatusException(HttpStatus.NOT_FOUND)))
                .toList();
    }

    private void replace(Long accountId, List<Role> selectedRoles) {
        assignments.deleteByAccountId(accountId);
        em.flush();

        for (Role role : selectedRoles) {
            AccountRole row = new AccountRole();
            row.setAccountId(accountId);
            row.setRoleId(role.getRoleId());

            assignments.save(row);
        }
    }

    private Role lockSuperadminRole() {
        return roles.lockSuperadminRole().orElseThrow();
    }
}
