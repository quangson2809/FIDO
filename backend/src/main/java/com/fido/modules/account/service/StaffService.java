package com.fido.modules.account.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.account.dto.request.StaffCreateRequest;
import com.fido.modules.account.dto.request.StaffPatchRequest;
import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.dto.response.StaffAccountSummaryDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AccountRoleRepository;
import com.fido.modules.account.repository.RoleRepository;
import com.fido.modules.audit.service.AuditService;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class StaffService {

    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final AccountRoleRepository assignments;
    private final AccountAccessService access;
    private final AuthenticationService authentication;
    private final AuditService audit;
    private final EntityManager em;

    public StaffService(
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

    @Transactional(readOnly = true)
    public ApiListResponse<StaffAccountSummaryDto> list(
            String q,
            Long roleId,
            Integer page,
            Integer pageSize
    ) {
        Pagination pagination = Pagination.of(page, pageSize);

        var result = accounts.findStaff(
                q,
                roleId,
                pagination.toPageable()
        );

        Map<Long, List<Role>> rolesByAccount =
                assignedRolesByAccount(
                        result.getContent()
                                .stream()
                                .map(Account::getAccountId)
                                .toList()
                );

        var staffAccounts = result.getContent()
                .stream()
                .map(account -> new StaffAccountSummaryDto(
                        AccountMapper.account(account),
                        rolesByAccount
                                .getOrDefault(
                                        account.getAccountId(),
                                        List.of()
                                )
                                .stream()
                                .map(AccountMapper::role)
                                .toList()
                ))
                .toList();

        return ApiListResponse.of(
                staffAccounts,
                pagination.meta(result.getTotalElements())
        );
    }

    private Map<Long, List<Role>> assignedRolesByAccount(
            List<Long> accountIds
    ) {
        if (accountIds.isEmpty()) {
            return Map.of();
        }

        var assignedRows =
                assignments.findAllByAccountIdIn(accountIds);

        if (assignedRows.isEmpty()) {
            return Map.of();
        }

        Map<Long, Role> rolesById = roles
                .findAllByRoleIdIn(
                        assignedRows.stream()
                                .map(AccountRole::getRoleId)
                                .distinct()
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(
                        Role::getRoleId,
                        Function.identity()
                ));

        var result = new HashMap<Long, List<Role>>();

        for (AccountRole assignment : assignedRows) {
            Role role = rolesById.get(
                    assignment.getRoleId()
            );

            if (role == null) {
                throw new IllegalStateException(
                        "Account role references missing role"
                );
            }

            result.computeIfAbsent(
                    assignment.getAccountId(),
                    ignored -> new ArrayList<>()
            ).add(role);
        }

        result.values().forEach(list ->
                list.sort(
                        Comparator.comparing(Role::getRoleId)
                )
        );

        return result;
    }

    @Transactional(readOnly = true)
    public StaffAccountDetailDto detail(Long accountId) {
        requireStaff(accountId);

        return access.findAccess(accountId)
                .orElseThrow();
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
                actor,
                "STAFF_CREATE",
                "ACCOUNT",
                account.getAccountId()
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
                actor,
                "STAFF_UPDATE",
                "ACCOUNT",
                accountId
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

