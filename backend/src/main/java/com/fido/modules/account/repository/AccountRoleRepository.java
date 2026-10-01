package com.fido.modules.account.repository;

import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.AccountRoleId;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface AccountRoleRepository extends Repository<AccountRole, AccountRoleId> {
    Optional<AccountRole> findById(AccountRoleId id);
    AccountRole save(AccountRole entity);
    List<AccountRole> findAllByAccountIdIn(Collection<Long> accountIds);
    void deleteByAccountId(Long accountId);
    boolean existsByRoleId(Long roleId);
    long countByRoleId(Long roleId);
}
