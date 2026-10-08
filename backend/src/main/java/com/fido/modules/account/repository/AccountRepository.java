package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Account;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface AccountRepository extends Repository<Account, Long> {
    Optional<Account> findById(Long id);
    Account save(Account entity);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Account a where a.accountId = :id")
    Optional<Account> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Query("""
        select a from Account a
        where :q is null or a.phone like concat('%',:q,'%') or a.email like concat('%',:q,'%')
        order by a.accountId
        """)
    org.springframework.data.domain.Page<Account> findCustomers(
        @org.springframework.data.repository.query.Param("q") String q,
        org.springframework.data.domain.Pageable pageable);
    Optional<Account> findByPhone(String phone);
    boolean existsByPhone(String phone);
    boolean existsByPhoneAndAccountIdNot(String phone, Long accountId);
    @org.springframework.data.jpa.repository.Query("""
        select a from Account a where exists (select ar from AccountRole ar join Role r on r.roleId=ar.roleId
          where ar.accountId=a.accountId and r.code in ('ADMIN','SUPERADMIN'))
        and (:q is null or a.phone like concat('%',:q,'%') or a.email like concat('%',:q,'%'))
        and (:roleId is null or exists (select ar from AccountRole ar where ar.accountId=a.accountId and ar.roleId=:roleId))
        order by a.accountId
        """)
    org.springframework.data.domain.Page<Account> findStaff(
        @org.springframework.data.repository.query.Param("q") String q,
        @org.springframework.data.repository.query.Param("roleId") Long roleId,
        org.springframework.data.domain.Pageable pageable);
}

