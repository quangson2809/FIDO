package com.fido.modules.account.repository;

import com.fido.modules.account.entity.RolePermission;
import com.fido.modules.account.entity.RolePermissionId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface RolePermissionRepository extends Repository<RolePermission, RolePermissionId> {
    Optional<RolePermission> findById(RolePermissionId id);
    RolePermission save(RolePermission entity);
    List<RolePermission> findAllByRoleIdIn(Collection<Long> roleIds);
    void deleteByRoleId(Long roleId);
    boolean existsByPermissionId(Long permissionId);
}
