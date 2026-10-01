package com.fido.modules.account.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.account.dto.response.StaffAccountDetailDto;
import com.fido.modules.account.dto.response.StaffAccountSummaryDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AccountRoleRepository;
import com.fido.modules.account.repository.RoleRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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
@Transactional(readOnly = true)
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class StaffQueryService {
    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final AccountRoleRepository assignments;
    private final AccountAccessService access;

    public StaffQueryService(AccountRepository accounts, RoleRepository roles,
                             AccountRoleRepository assignments, AccountAccessService access) {
        this.accounts = accounts;
        this.roles = roles;
        this.assignments = assignments;
        this.access = access;
    }

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

    public StaffAccountDetailDto detail(Long accountId) {
        requireStaff(accountId);

        return access.findAccess(accountId)
                .orElseThrow();
    }


    private void requireStaff(Long accountId) {
        boolean isStaff = roles.findAssignedToAccount(accountId).stream()
                .anyMatch(role -> Set.of("ADMIN", "SUPERADMIN").contains(role.getCode()));
        if (!isStaff) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
}
