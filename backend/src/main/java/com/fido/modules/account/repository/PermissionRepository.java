package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Permission;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface PermissionRepository extends Repository<Permission, Long> {
    Optional<Permission> findById(Long id);
    Permission save(Permission entity);
}
