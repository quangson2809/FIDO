package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Permission;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends Repository<Permission, Long> {
    Optional<Permission> findById(Long id);
    Permission save(Permission entity);

    @Query("""
        select distinct p from Permission p
        join RolePermission rp on rp.permissionId = p.permissionId
        join AccountRole ar on ar.roleId = rp.roleId
        where ar.accountId = :accountId
        """)
    List<Permission> findGrantedToAccount(@Param("accountId") Long accountId);
}
