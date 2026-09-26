package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.*;
import com.fido.modules.account.dto.response.*;
import com.fido.modules.account.entity.*;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.*;
import com.fido.modules.audit.service.AuditService;
import jakarta.persistence.EntityManager;
import java.util.*;
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
    private final EntityManager em;
    public RbacService(RoleRepository roles,PermissionRepository permissions,RolePermissionRepository mappings,
                       AccountRoleRepository assignments,AuditService audit,EntityManager em) {
        this.roles=roles;this.permissions=permissions;this.mappings=mappings;this.assignments=assignments;
        this.audit=audit;this.em=em;
    }
    @Transactional(readOnly=true)
    public AccessControlDto accessControl() {
        return new AccessControlDto(roles.findAllByOrderByRoleIdAsc().stream().map(this::detail).toList(),
            permissions.findAllByOrderByPermissionIdAsc().stream().map(AccountMapper::permission).toList());
    }
    @Transactional(readOnly=true)
    public List<PermissionDto> permissions() {
        return permissions.findAllByOrderByPermissionIdAsc().stream().map(AccountMapper::permission).toList();
    }
    public RoleDetailDto createRole(Long actor,RoleCreateRequest request) {
        lock();
        Role role=new Role();role.setCode(request.code());role.setName(request.name());role.setDescription(request.description());
        roles.save(role);replacePermissions(role,request.permission_ids());
        em.flush();audit.record(actor,"ROLE_CREATE","ROLE",role.getRoleId());return detail(role);
    }
    public RoleDetailDto updateRole(Long actor,Long id,RolePatchRequest request) {
        lock();Role role=role(id);
        if(request.getName()!=null) role.setName(request.getName());
        if(request.isDescriptionPresent()) role.setDescription(request.getDescription());
        replacePermissions(role,request.getPermissionIds());
        em.flush();audit.record(actor,"ROLE_UPDATE","ROLE",id);return detail(role);
    }
    public void deleteRole(Long actor,Long id) {
        lock();Role role=role(id);
        if(Set.of("ADMIN","SUPERADMIN").contains(role.getCode()) || assignments.existsByRoleId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        mappings.deleteByRoleId(id);em.flush();roles.delete(role);
        audit.record(actor,"ROLE_DELETE","ROLE",id);
    }
    public PermissionDto createPermission(Long actor,PermissionCreateRequest request) {
        lock();Permission permission=new Permission();permission.setCode(request.code());permission.setName(request.name());
        permissions.save(permission);em.flush();audit.record(actor,"PERMISSION_CREATE","PERMISSION",permission.getPermissionId());
        return AccountMapper.permission(permission);
    }
    public PermissionDto updatePermission(Long actor,Long id,PermissionPatchRequest request) {
        lock();Permission permission=permission(id);
        if(request.code()!=null) permission.setCode(request.code());
        if(request.name()!=null) permission.setName(request.name());
        em.flush();audit.record(actor,"PERMISSION_UPDATE","PERMISSION",id);return AccountMapper.permission(permission);
    }
    public void deletePermission(Long actor,Long id) {
        lock();Permission permission=permission(id);
        if(mappings.existsByPermissionId(id)) throw new ResponseStatusException(HttpStatus.CONFLICT);
        permissions.delete(permission);audit.record(actor,"PERMISSION_DELETE","PERMISSION",id);
    }
    private void replacePermissions(Role role,List<Long> ids) {
        if(ids==null) return;
        var unique=new LinkedHashSet<>(ids);
        unique.forEach(this::permission);
        mappings.deleteByRoleId(role.getRoleId());em.flush();
        for(Long id:unique) {RolePermission mapping=new RolePermission();mapping.setRoleId(role.getRoleId());
            mapping.setPermissionId(id);mappings.save(mapping);}
    }
    private Role role(Long id) {return roles.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private Permission permission(Long id) {return permissions.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));}
    private RoleDetailDto detail(Role role) {return new RoleDetailDto(role.getRoleId(),role.getCode(),role.getName(),role.getDescription(),
        permissions.findByRole(role.getRoleId()).stream().map(AccountMapper::permission).toList());}
    private void lock() {roles.lockAdministration().orElseThrow(() -> new IllegalStateException("System role missing"));}
}
