package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Role;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface RoleRepository extends Repository<Role, Long> {
    Optional<Role> findById(Long id);
    Role save(Role entity);
}
