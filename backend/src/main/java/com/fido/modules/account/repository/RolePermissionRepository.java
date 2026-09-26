package com.fido.modules.account.repository;

import com.fido.modules.account.entity.RolePermission;
import com.fido.modules.account.entity.RolePermissionId;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface RolePermissionRepository extends Repository<RolePermission, RolePermissionId> {
    Optional<RolePermission> findById(RolePermissionId id);
    RolePermission save(RolePermission entity);
}
