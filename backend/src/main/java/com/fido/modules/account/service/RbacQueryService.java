package com.fido.modules.account.service;

import com.fido.modules.account.dto.response.AccessControlDto;
import com.fido.modules.account.dto.response.PermissionDto;
import com.fido.modules.account.dto.response.RoleDetailDto;
import com.fido.modules.account.entity.Permission;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RolePermissionRepository;
import com.fido.modules.account.repository.RoleRepository;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class RbacQueryService {
    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final RolePermissionRepository mappings;

    public RbacQueryService(RoleRepository roles, PermissionRepository permissions,
                            RolePermissionRepository mappings) {
        this.roles = roles;
        this.permissions = permissions;
        this.mappings = mappings;
    }

    public AccessControlDto accessControl() {
        List<Role> allRoles = roles.findAllByOrderByRoleIdAsc();
        List<Permission> allPermissions =
                permissions.findAllByOrderByPermissionIdAsc();

        Map<Long, Set<Long>> permissionIdsByRole =
                permissionIdsByRole(allRoles);

        var roleDtos = allRoles.stream()
                .map(role ->
                        detail(
                                role,
                                allPermissions,
                                permissionIdsByRole
                        )
                )
                .toList();

        var permissionDtos = allPermissions.stream()
                .map(AccountMapper::permission)
                .toList();

        return new AccessControlDto(
                roleDtos,
                permissionDtos
        );
    }

    public List<PermissionDto> permissions() {
        return permissions.findAllByOrderByPermissionIdAsc()
                .stream()
                .map(AccountMapper::permission)
                .toList();
    }

    private Map<Long, Set<Long>> permissionIdsByRole(
            List<Role> allRoles
    ) {
        if (allRoles.isEmpty()) {
            return Map.of();
        }

        var result = new HashMap<Long, Set<Long>>();

        mappings.findAllByRoleIdIn(
                allRoles.stream()
                        .map(Role::getRoleId)
                        .toList()
        ).forEach(mapping ->
                result.computeIfAbsent(
                        mapping.getRoleId(),
                        ignored -> new LinkedHashSet<>()
                ).add(mapping.getPermissionId())
        );

        return result;
    }

    private RoleDetailDto detail(
            Role role,
            List<Permission> allPermissions,
            Map<Long, Set<Long>> permissionIdsByRole
    ) {
        Set<Long> permissionIds = permissionIdsByRole
                .getOrDefault(
                        role.getRoleId(),
                        Set.of()
                );

        var permissionDtos = allPermissions.stream()
                .filter(permission ->
                        permissionIds.contains(
                                permission.getPermissionId()
                        )
                )
                .map(AccountMapper::permission)
                .toList();

        return new RoleDetailDto(
                role.getRoleId(),
                role.getCode(),
                role.getName(),
                role.getDescription(),
                permissionDtos
        );
    }

}
