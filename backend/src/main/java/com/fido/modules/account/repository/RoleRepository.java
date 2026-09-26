package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Role;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface RoleRepository extends Repository<Role, Long> {
    Optional<Role> findById(Long id);
    Role save(Role entity);

    @Query("select r from Role r join AccountRole ar on ar.roleId = r.roleId where ar.accountId = :accountId")
    List<Role> findAssignedToAccount(@Param("accountId") Long accountId);
}
