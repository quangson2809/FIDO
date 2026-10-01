package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Role;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface RoleRepository extends Repository<Role, Long> {
    Optional<Role> findById(Long id);
    Role save(Role entity);
    Optional<Role> findByCode(String code);
    List<Role> findAllByOrderByRoleIdAsc();
    List<Role> findAllByRoleIdIn(Collection<Long> roleIds);
    void delete(Role role);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Role r where r.code = 'SUPERADMIN'")
    Optional<Role> lockSuperadminRole();

    @Query("select r from Role r join AccountRole ar on ar.roleId = r.roleId where ar.accountId = :accountId")
    List<Role> findAssignedToAccount(@Param("accountId") Long accountId);

    @Query("""
        select case when count(r) > 0 then true else false end
        from Role r
        join AccountRole ar on ar.roleId = r.roleId
        where ar.accountId = :accountId
          and r.code = :roleCode
        """)
    boolean existsAssignedToAccountByCode(
            @Param("accountId") Long accountId,
            @Param("roleCode") String roleCode
    );
}
