package com.fido.modules.account.repository;

import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.AccountRoleId;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface AccountRoleRepository extends Repository<AccountRole, AccountRoleId> {
    Optional<AccountRole> findById(AccountRoleId id);
    AccountRole save(AccountRole entity);
}
