package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Account;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface AccountRepository extends Repository<Account, Long> {
    Optional<Account> findById(Long id);
    Account save(Account entity);
}
