package com.fido.modules.account.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.account.dto.request.PermissionCreateRequest;
import com.fido.modules.account.dto.request.PermissionPatchRequest;
import com.fido.modules.account.dto.request.RoleCreateRequest;
import com.fido.modules.account.dto.request.RolePatchRequest;
import com.fido.modules.account.dto.response.AccessControlDto;
import com.fido.modules.account.dto.response.PermissionDto;
import com.fido.modules.account.dto.response.RoleDetailDto;
import com.fido.modules.account.entity.Permission;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.entity.RolePermission;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRoleRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RolePermissionRepository;
import com.fido.modules.account.repository.RoleRepository;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class RbacService {

    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final RolePermissionRepository mappings;
    private final AccountRoleRepository assignments;
    private final AuditService audit;
    private final EntityManager entityManager;

    public RbacService(
            RoleRepository roles,
            PermissionRepository permissions,
            RolePermissionRepository mappings,
            AccountRoleRepository assignments,
            AuditService audit,
            EntityManager entityManager
    ) {
        this.roles = roles;
        this.permissions = permissions;
        this.mappings = mappings;
        this.assignments = assignments;
        this.audit = audit;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public ApiListResponse<PermissionDto> permissions(
            Integer page,
            Integer pageSize
    ) {
        Pagination pagination = Pagination.of(page, pageSize);

        var result = permissions.findAllByOrderByPermissionIdAsc(
                pagination.toPageable()
        );

        return ApiListResponse.of(
                result.getContent()
                        .stream()
                        .map(AccountMapper::permission)
                        .toList(),
                pagination.meta(result.getTotalElements())
        );
    }

    public RoleDetailDto createRole(
            Long actor,
            RoleCreateRequest request
    ) {
        lockSuperadminRole();

        Role role = new Role();
        role.setCode(request.code());
        role.setName(request.name());
        role.setDescription(request.description());

        roles.save(role);
        replacePermissions(role, request.permission_ids());

        entityManager.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.ROLE_CREATE,
                        AuditTargetType.ROLE,
                        role.getRoleId()
                )
        );

        return detail(role);
    }

    public RoleDetailDto updateRole(
            Long actor,
            Long roleId,
            RolePatchRequest request
    ) {
        lockSuperadminRole();

        Role role = role(roleId);

        if (request.getName() != null) {
            role.setName(request.getName());
        }

        if (request.isDescriptionPresent()) {
            role.setDescription(request.getDescription());
        }

        replacePermissions(
                role,
                request.getPermissionIds()
        );

        entityManager.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.ROLE_UPDATE,
                        AuditTargetType.ROLE,
                        roleId
                )
        );

        return detail(role);
    }

    public void deleteRole(
            Long actor,
            Long roleId
    ) {
        lockSuperadminRole();

        Role role = role(roleId);

        boolean systemRole = Set.of("ADMIN", "SUPERADMIN")
                .contains(role.getCode());

        if (systemRole || assignments.existsByRoleId(roleId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        mappings.deleteByRoleId(roleId);
        entityManager.flush();

        roles.delete(role);

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.ROLE_DELETE,
                        AuditTargetType.ROLE,
                        roleId
                )
        );
    }

    public PermissionDto createPermission(
            Long actor,
            PermissionCreateRequest request
    ) {
        lockSuperadminRole();

        Permission permission = new Permission();
        permission.setCode(request.code());
        permission.setName(request.name());

        permissions.save(permission);
        entityManager.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.PERMISSION_CREATE,
                        AuditTargetType.PERMISSION,
                        permission.getPermissionId()
                )
        );

        return AccountMapper.permission(permission);
    }

    public PermissionDto updatePermission(
            Long actor,
            Long permissionId,
            PermissionPatchRequest request
    ) {
        lockSuperadminRole();

        Permission permission = permission(permissionId);

        if (request.code() != null) {
            permission.setCode(request.code());
        }

        if (request.name() != null) {
            permission.setName(request.name());
        }

        entityManager.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.PERMISSION_UPDATE,
                        AuditTargetType.PERMISSION,
                        permissionId
                )
        );

        return AccountMapper.permission(permission);
    }

    public void deletePermission(
            Long actor,
            Long permissionId
    ) {
        lockSuperadminRole();

        Permission permission = permission(permissionId);

        if (mappings.existsByPermissionId(permissionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        permissions.delete(permission);

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.PERMISSION_DELETE,
                        AuditTargetType.PERMISSION,
                        permissionId
                )
        );
    }

    private void replacePermissions(
            Role role,
            List<Long> permissionIds
    ) {
        if (permissionIds == null) {
            return;
        }

        var uniquePermissionIds = new LinkedHashSet<>(permissionIds);

        uniquePermissionIds.forEach(this::permission);

        mappings.deleteByRoleId(role.getRoleId());
        entityManager.flush();

        for (Long permissionId : uniquePermissionIds) {
            RolePermission mapping = new RolePermission();
            mapping.setRoleId(role.getRoleId());
            mapping.setPermissionId(permissionId);

            mappings.save(mapping);
        }
    }

    private Role role(Long roleId) {
        return roles
                .findById(roleId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Permission permission(Long permissionId) {
        return permissions
                .findById(permissionId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
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

    private RoleDetailDto detail(Role role) {
        var permissionDtos = permissions
                .findByRole(role.getRoleId())
                .stream()
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

    private void lockSuperadminRole() {
        roles
                .lockSuperadminRole()
                .orElseThrow(() ->
                        new IllegalStateException("System role missing")
                );
    }
}

