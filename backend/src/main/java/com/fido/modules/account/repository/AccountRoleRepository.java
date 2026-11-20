package com.fido.modules.account.repository;

import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.AccountRoleId;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Chỉ cung cấp thao tác gán/gỡ role có chủ đích; không mở toàn bộ API xóa mặc định. */
public interface AccountRoleRepository extends Repository<AccountRole, AccountRoleId> {
    Optional<AccountRole> findById(AccountRoleId id);

    AccountRole save(AccountRole entity);

    List<AccountRole> findAllByAccountIdIn(Collection<Long> accountIds);

    void deleteByAccountId(Long accountId);

    boolean existsByRoleId(Long roleId);

    @Query(
            """
            select count(ar)
            from AccountRole ar join Account a on a.accountId=ar.accountId
            where ar.roleId=:roleId and a.status='ACTIVE' and a.deletedAt is null
            """)
    long countActiveAccountsByRoleId(@Param("roleId") Long roleId);
}
