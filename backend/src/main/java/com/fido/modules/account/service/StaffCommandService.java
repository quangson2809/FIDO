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
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import jakarta.persistence.EntityManager;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class StaffCommandService {

    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final AccountRoleRepository assignments;
    private final AccountAccessService access;
    private final AuthenticationService authentication;
    private final AuditService audit;
    private final EntityManager em;

    public StaffCommandService(
            AccountRepository accounts,
            RoleRepository roles,
            AccountRoleRepository assignments,
            AccountAccessService access,
            AuthenticationService authentication,
            AuditService audit,
            EntityManager em
    ) {
        this.accounts = accounts;
        this.roles = roles;
        this.assignments = assignments;
        this.access = access;
        this.authentication = authentication;
        this.audit = audit;
        this.em = em;
    }

    public StaffAccountDetailDto create(
            Long actor,
            StaffCreateRequest request
    ) {
        lockSuperadminRole();
        requireCreatePhoneAvailable(request.phone());

        List<Role> selectedRoles =
                resolveCreateRoles(request.role_ids());

        Account account = createAccount(request);

        replace(
                account.getAccountId(),
                selectedRoles
        );

        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.STAFF_CREATE,
                        AuditTargetType.ACCOUNT,
                        account.getAccountId()
                )
        );

        return access.findAccess(account.getAccountId())
                .orElseThrow();
    }

    public StaffAccountDetailDto update(
            Long actor,
            Long accountId,
            StaffPatchRequest request
    ) {
        Role superadminRole = lockSuperadminRole();

        requireStaff(accountId);

        Account account = accounts.findById(accountId)
                .orElseThrow();

        applyAccountPatch(
                account,
                request
        );

        applyRolePatch(
                accountId,
                request,
                superadminRole
        );

        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.STAFF_UPDATE,
                        AuditTargetType.ACCOUNT,
                        accountId
                )
        );

        return access.findAccess(accountId)
                .orElseThrow();
    }

    private void requireCreatePhoneAvailable(String phone) {
        if (accounts.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private List<Role> resolveCreateRoles(
            List<Long> requestedRoleIds
    ) {
        List<Long> roleIds = requestedRoleIds == null
                ? List.of(defaultAdminRoleId())
                : requestedRoleIds;

        List<Role> selectedRoles = resolve(roleIds);
        requireStaffRole(selectedRoles);

        return selectedRoles;
    }

    private Long defaultAdminRoleId() {
        return roles.findByCode("ADMIN")
                .orElseThrow()
                .getRoleId();
    }

    private void requireStaffRole(
            List<Role> selectedRoles
    ) {
        boolean hasStaffRole = selectedRoles.stream()
                .anyMatch(role ->
                        Set.of("ADMIN", "SUPERADMIN")
                                .contains(role.getCode())
                );

        if (!hasStaffRole) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }

    private Account createAccount(
            StaffCreateRequest request
    ) {
        Account account = new Account();
        account.setPhone(request.phone());
        account.setEmail(request.email());
        account.setPasswordHash(
                authentication.hashPassword(request.password())
        );

        return accounts.save(account);
    }

    private void applyAccountPatch(
            Account account,
            StaffPatchRequest request
    ) {
        if (request.phone() != null) {
            requireUpdatePhoneAvailable(
                    request.phone(),
                    account.getAccountId()
            );
            account.setPhone(request.phone());
        }

        if (request.email() != null) {
            account.setEmail(request.email());
        }
    }

    private void requireUpdatePhoneAvailable(
            String phone,
            Long accountId
    ) {
        if (accounts.existsByPhoneAndAccountIdNot(
                phone,
                accountId
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private void applyRolePatch(
            Long accountId,
            StaffPatchRequest request,
            Role superadminRole
    ) {
        if (request.role_ids() == null) {
            return;
        }

        List<Role> selectedRoles = resolve(
                request.role_ids()
        );

        requireStaffRole(selectedRoles);

        protectLastSuperadmin(
                accountId,
                selectedRoles,
                superadminRole
        );

        replace(
                accountId,
                selectedRoles
        );
    }

    private void protectLastSuperadmin(
            Long accountId,
            List<Role> selectedRoles,
            Role superadminRole
    ) {
        boolean removingSuperadmin = access.isSuperadmin(accountId)
                && selectedRoles.stream()
                        .noneMatch(role ->
                                "SUPERADMIN".equals(role.getCode())
                        );

        if (removingSuperadmin
                && assignments.countByRoleId(
                        superadminRole.getRoleId()
                ) <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private void requireStaff(Long accountId) {
        boolean isStaff = roles.findAssignedToAccount(accountId)
                .stream()
                .anyMatch(role ->
                        Set.of("ADMIN", "SUPERADMIN")
                                .contains(role.getCode())
                );

        if (!isStaff) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private List<Role> resolve(List<Long> roleIds) {
        return new LinkedHashSet<>(roleIds)
                .stream()
                .map(roleId ->
                        roles.findById(roleId)
                                .orElseThrow(() ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND
                                        )
                                )
                )
                .toList();
    }

    private void replace(
            Long accountId,
            List<Role> selectedRoles
    ) {
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
        return roles.lockSuperadminRole()
                .orElseThrow();
    }
}
