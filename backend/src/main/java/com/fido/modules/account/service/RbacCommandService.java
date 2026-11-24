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
    private final RolePermissionRepository rolePermissions;
    private final AccountRoleRepository accountRoles;
    private final AuditWriteService audit;
    private final EntityManager entityManager;

    public RbacCommandService(
            RoleRepository roles,
            PermissionRepository permissions,
            RolePermissionRepository rolePermissions,
            AccountRoleRepository accountRoles,
            AuditWriteService audit,
            EntityManager entityManager) {
        this.roles = roles;
        this.permissions = permissions;
        this.rolePermissions = rolePermissions;
        this.accountRoles = accountRoles;
        this.audit = audit;
        this.entityManager = entityManager;
    }

    public RoleDetailDto createRole(RoleCreateRequest request) {
        lockSuperadminRole();

        Role role = Role.create(request.code(), request.name(), request.description());
        // Các lệnh RBAC cùng khóa SUPERADMIN; kiểm tra mã trong vùng khóa trước khi ghi.
        if (roles.findByCode(role.getCode()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ROLE_CODE_ALREADY_EXISTS");
        }
        roles.save(role);
        replacePermissions(role, request.permission_ids());

        entityManager.flush();
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ROLE_CREATE,
                        AuditEntityType.ROLE,
                        role.getRoleId().toString(),
                        Map.of(),
                        Map.of(
                                "code",
                                role.getCode(),
                                "status",
                                role.getStatus(),
                                "active",
                                "ACTIVE".equals(role.getStatus()),
                                "permission_ids",
                                permissions.findByRole(role.getRoleId()).stream()
                                        .map(Permission::getPermissionId)
                                        .sorted()
                                        .toList(),
                                "permission_count",
                                permissions.findByRole(role.getRoleId()).size())));

        return detail(role);
    }

    public RoleDetailDto updateRole(Long roleId, RolePatchRequest request) {
        lockSuperadminRole();
        Role role = role(roleId);
        Map<String, Object> before =
                Map.of(
                        "code",
                        role.getCode(),
                        "status",
                        role.getStatus(),
                        "active",
                        "ACTIVE".equals(role.getStatus()),
                        "permission_ids",
                        permissions.findByRole(roleId).stream()
                                .map(Permission::getPermissionId)
                                .sorted()
                                .toList(),
                        "permission_count",
                        permissions.findByRole(roleId).size());

        if (request.getName() != null) {
            role.setName(request.getName().trim());
        }
        if (request.isDescriptionPresent()) {
            role.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            role.changeStatus(request.getStatus());
        }

        replacePermissions(role, request.getPermissionIds());
        entityManager.flush();
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ROLE_UPDATE,
                        AuditEntityType.ROLE,
                        roleId.toString(),
                        before,
                        Map.of(
                                "code",
                                role.getCode(),
                                "status",
                                role.getStatus(),
                                "active",
                                "ACTIVE".equals(role.getStatus()),
                                "permission_ids",
                                permissions.findByRole(roleId).stream()
                                        .map(Permission::getPermissionId)
                                        .sorted()
                                        .toList(),
                                "permission_count",
                                permissions.findByRole(roleId).size())));

        return detail(role);
    }

    public void deleteRole(Long roleId) {
        lockSuperadminRole();
        Role role = role(roleId);

        Map<String, Object> before =
                Map.of(
                        "code",
                        role.getCode(),
                        "status",
                        role.getStatus(),
                        "active",
                        "ACTIVE".equals(role.getStatus()),
                        "permission_ids",
                        permissions.findByRole(roleId).stream()
                                .map(Permission::getPermissionId)
                                .sorted()
                                .toList(),
                        "permission_count",
                        permissions.findByRole(roleId).size());
        if (SYSTEM_ROLE_CODES.contains(role.getCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_ROLE_PROTECTED");
        }
        if (accountRoles.existsByRoleId(roleId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ROLE_IN_USE");
        }

        rolePermissions.deleteByRoleId(roleId);
        entityManager.flush();
        roles.delete(role);
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ROLE_DELETE,
                        AuditEntityType.ROLE,
                        roleId.toString(),
                        before,
                        Map.of()));
    }

    public PermissionDto createPermission(PermissionCreateRequest request) {
        Role superadmin = lockSuperadminRole();

        if (!SupportedPermissions.CODES.contains(
                request.code().trim().toUpperCase(java.util.Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PERMISSION_UNSUPPORTED");
        }
        Permission permission = new Permission();
        permission.setCode(request.code().trim().toUpperCase(java.util.Locale.ROOT));
        permission.setName(request.name());
        permission.setDescription(request.description());

        if (permissions.existsByCode(permission.getCode())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "PERMISSION_CODE_ALREADY_EXISTS");
        }
        permissions.save(permission);
        entityManager.flush();

        // Tạo quyền và gán quyền đó cho SUPERADMIN cùng giao dịch để giữ đủ quyền hệ thống.
        RolePermission grant = new RolePermission();
        grant.setRoleId(superadmin.getRoleId());
        grant.setPermissionId(permission.getPermissionId());
        rolePermissions.save(grant);
        entityManager.flush();

        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.PERMISSION_CREATE,
                        AuditEntityType.PERMISSION,
                        permission.getPermissionId().toString(),
                        Map.of(),
                        Map.of("code", permission.getCode(), "active", true)));

        return AccountMapper.permission(permission);
    }

    public PermissionDto updatePermission(Long permissionId, PermissionPatchRequest request) {
        lockSuperadminRole();
        Permission permission = permission(permissionId);
        Map<String, Object> before = Map.of("code", permission.getCode(), "active", true);

        if (request.name() != null) {
            permission.setName(request.name().trim());
        }
        if (request.descriptionPresent()) {
            permission.setDescription(request.description());
        }

        entityManager.flush();
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.PERMISSION_UPDATE,
                        AuditEntityType.PERMISSION,
                        permissionId.toString(),
                        before,
                        Map.of("code", permission.getCode(), "active", true)));

        return AccountMapper.permission(permission);
    }

    public void deletePermission(Long permissionId) {
        Role superadmin = lockSuperadminRole();
        Permission permission = permission(permissionId);
        Map<String, Object> before = Map.of("code", permission.getCode(), "active", true);

        if (SupportedPermissions.CODES.contains(permission.getCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SYSTEM_PERMISSION_PROTECTED");
        }

        List<RolePermission> references = rolePermissions.findAllByPermissionId(permissionId);
        boolean usedOutsideSuperadmin =
                references.stream()
                        .anyMatch(row -> !row.getRoleId().equals(superadmin.getRoleId()));
        if (usedOutsideSuperadmin) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PERMISSION_IN_USE");
        }

        rolePermissions.deleteByRoleIdAndPermissionId(superadmin.getRoleId(), permissionId);
        entityManager.flush();
        permissions.delete(permission);
        entityManager.flush();

        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.PERMISSION_DELETE,
                        AuditEntityType.PERMISSION,
                        permissionId.toString(),
                        before,
                        Map.of()));
    }

    /**
     * role là bản ghi đã lấy trong giao dịch; permissionIds là danh sách đầy đủ từ create/PATCH, null
     * nghĩa giữ nguyên.
     * SUPERADMIN phải giữ đúng toàn bộ quyền hiện có, không chấp nhận tập con.
     */
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
        uniquePermissionIds.forEach(
                id -> {
                    Permission p = permission(id);
                    if (!"SUPERADMIN".equals(role.getCode())
                            && !SupportedPermissions.CODES.contains(p.getCode()))
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST, "PERMISSION_UNSUPPORTED");
                });

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

        rolePermissions.deleteByRoleId(role.getRoleId());
        entityManager.flush();

        for (Long permissionId : uniquePermissionIds) {
            RolePermission mapping = new RolePermission();
            mapping.setRoleId(role.getRoleId());
            mapping.setPermissionId(permissionId);
            rolePermissions.save(mapping);
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
        return permissions
                .findById(permissionId)
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
