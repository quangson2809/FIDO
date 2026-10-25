package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.PermissionCreateRequest;
import com.fido.modules.account.dto.request.PermissionPatchRequest;
import com.fido.modules.account.dto.request.RoleCreateRequest;
import com.fido.modules.account.dto.request.RolePatchRequest;
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

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class RbacCommandService {

    private static final Set<String> SYSTEM_ROLE_CODES = Set.of("CUSTOMER", "ADMIN", "SUPERADMIN");
    private static final Set<String> SYSTEM_PERMISSION_CODES =
            Set.of(
                    "CATALOG_READ",
                    "CATALOG_WRITE",
                    "INVENTORY_READ",
                    "INVENTORY_WRITE",
                    "ORDER_READ",
                    "ORDER_EDIT",
                    "ORDER_PAYMENT",
                    "ORDER_AFTER_SALES",
                    "AUDIT_READ",
                    "CONTENT_READ",
                    "CONTENT_WRITE",
                    "CUSTOMER_READ",
                    "REPORT_READ");

    private final RoleRepository roles;
    private final PermissionRepository permissions;
    private final RolePermissionRepository mappings;
    private final AccountRoleRepository assignments;
    private final AuditService audit;
    private final EntityManager entityManager;

    public RbacCommandService(
            RoleRepository roles,
            PermissionRepository permissions,
            RolePermissionRepository mappings,
            AccountRoleRepository assignments,
            AuditService audit,
            EntityManager entityManager) {
        this.roles = roles;
        this.permissions = permissions;
        this.mappings = mappings;
        this.assignments = assignments;
        this.audit = audit;
        this.entityManager = entityManager;
    }

    public RoleDetailDto createRole(Long actor, RoleCreateRequest request) {
        lockSuperadminRole();

        Role role = new Role();
        role.setCode(request.code());
        role.setName(request.name());
        role.setDescription(request.description());
        role.setStatus("ACTIVE");

        roles.save(role);
        replacePermissions(role, request.permission_ids());

        entityManager.flush();
        audit.record(
                AuditEvent.of(actor, AuditAction.ROLE_CREATE, AuditTargetType.ROLE, role.getRoleId()));

        return detail(role);
    }

    public RoleDetailDto updateRole(Long actor, Long roleId, RolePatchRequest request) {
        lockSuperadminRole();
        Role role = role(roleId);

        if (request.getName() != null) {
            role.setName(request.getName().trim());
        }
        if (request.isDescriptionPresent()) {
            role.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            if ("SUPERADMIN".equals(role.getCode()) && !"ACTIVE".equals(request.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_ROLE_PROTECTED");
            }
            role.setStatus(request.getStatus());
        }

        replacePermissions(role, request.getPermissionIds());
        entityManager.flush();
        audit.record(AuditEvent.of(actor, AuditAction.ROLE_UPDATE, AuditTargetType.ROLE, roleId));

        return detail(role);
    }

    public void deleteRole(Long actor, Long roleId) {
        lockSuperadminRole();
        Role role = role(roleId);

        if (SYSTEM_ROLE_CODES.contains(role.getCode()) || assignments.existsByRoleId(roleId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        mappings.deleteByRoleId(roleId);
        entityManager.flush();
        roles.delete(role);
        audit.record(AuditEvent.of(actor, AuditAction.ROLE_DELETE, AuditTargetType.ROLE, roleId));
    }

    public PermissionDto createPermission(Long actor, PermissionCreateRequest request) {
        Role superadmin = lockSuperadminRole();

        Permission permission = new Permission();
        permission.setCode(request.code());
        permission.setName(request.name());
        permission.setDescription(request.description());

        permissions.save(permission);
        entityManager.flush();

        // Permission creation and the corresponding SUPERADMIN grant are one atomic mutation.
        RolePermission grant = new RolePermission();
        grant.setRoleId(superadmin.getRoleId());
        grant.setPermissionId(permission.getPermissionId());
        mappings.save(grant);
        entityManager.flush();

        audit.record(
                AuditEvent.of(
                        actor, AuditAction.PERMISSION_CREATE, AuditTargetType.PERMISSION,
                        permission.getPermissionId()));

        return AccountMapper.permission(permission);
    }

    public PermissionDto updatePermission(
            Long actor, Long permissionId, PermissionPatchRequest request) {
        lockSuperadminRole();
        Permission permission = permission(permissionId);

        if (request.name() != null) {
            permission.setName(request.name().trim());
        }
        if (request.descriptionPresent()) {
            permission.setDescription(request.description());
        }

        entityManager.flush();
        audit.record(
                AuditEvent.of(
                        actor, AuditAction.PERMISSION_UPDATE, AuditTargetType.PERMISSION, permissionId));

        return AccountMapper.permission(permission);
    }

    public void deletePermission(Long actor, Long permissionId) {
        Role superadmin = lockSuperadminRole();
        Permission permission = permission(permissionId);

        if (SYSTEM_PERMISSION_CODES.contains(permission.getCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_PERMISSION_PROTECTED");
        }

        List<RolePermission> references = mappings.findAllByPermissionId(permissionId);
        boolean usedOutsideSuperadmin =
                references.stream().anyMatch(row -> !row.getRoleId().equals(superadmin.getRoleId()));
        if (usedOutsideSuperadmin) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PERMISSION_IN_USE");
        }

        mappings.deleteByRoleIdAndPermissionId(superadmin.getRoleId(), permissionId);
        entityManager.flush();
        permissions.delete(permission);
        entityManager.flush();

        audit.record(
                AuditEvent.of(
                        actor, AuditAction.PERMISSION_DELETE, AuditTargetType.PERMISSION, permissionId));
    }

    private void replacePermissions(Role role, List<Long> permissionIds) {
        if (permissionIds == null) {
            if ("SUPERADMIN".equals(role.getCode())) {
                requireSuperadminPermissionSet(role);
            }
            return;
        }

        Set<Long> uniquePermissionIds = new LinkedHashSet<>(permissionIds);
        if (uniquePermissionIds.size() != permissionIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        uniquePermissionIds.forEach(this::permission);

        if ("SUPERADMIN".equals(role.getCode())) {
            Set<Long> catalogueIds =
                    permissions.findAllByOrderByPermissionIdAsc().stream()
                            .map(Permission::getPermissionId)
                            .collect(Collectors.toSet());
            if (!uniquePermissionIds.equals(catalogueIds)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_ROLE_PROTECTED");
            }
            if (!"ACTIVE".equals(role.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_ROLE_PROTECTED");
            }
        }

        mappings.deleteByRoleId(role.getRoleId());
        entityManager.flush();

        for (Long permissionId : uniquePermissionIds) {
            RolePermission mapping = new RolePermission();
            mapping.setRoleId(role.getRoleId());
            mapping.setPermissionId(permissionId);
            mappings.save(mapping);
        }
    }

    private void requireSuperadminPermissionSet(Role role) {
        if (!"SUPERADMIN".equals(role.getCode())) {
            return;
        }
        Set<Long> actual =
                permissions.findByRole(role.getRoleId()).stream()
                        .map(Permission::getPermissionId)
                        .collect(Collectors.toSet());
        Set<Long> expected =
                permissions.findAllByOrderByPermissionIdAsc().stream()
                        .map(Permission::getPermissionId)
                        .collect(Collectors.toSet());
        if (!actual.equals(expected) || !"ACTIVE".equals(role.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_ROLE_PROTECTED");
        }
    }

    private Role role(Long roleId) {
        return roles.findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Permission permission(Long permissionId) {
        return permissions.findById(permissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private RoleDetailDto detail(Role role) {
        var permissionDtos =
                permissions.findByRole(role.getRoleId()).stream()
                        .map(AccountMapper::permission)
                        .toList();

        return new RoleDetailDto(
                role.getRoleId(),
                role.getCode(),
                role.getName(),
                role.getDescription(),
                role.getStatus(),
                permissionDtos);
    }

    private Role lockSuperadminRole() {
        return roles.lockSuperadminRole()
                .orElseThrow(() -> new IllegalStateException("System role missing"));
    }
}
