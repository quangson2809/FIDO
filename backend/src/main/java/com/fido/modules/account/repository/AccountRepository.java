package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Account;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Không cung cấp thao tác xóa mặc định để bảo vệ lịch sử tài khoản. */
public interface AccountRepository extends Repository<Account, Long> {
    Optional<Account> findById(Long id);

    Account save(Account entity);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.accountId = :id")
    Optional<Account> findByIdForUpdate(@Param("id") Long id);

    @Query(
            """
            select a from Account a
            where a.deletedAt is null
              and exists (
                  select ar from AccountRole ar join Role r on r.roleId=ar.roleId
                  where ar.accountId=a.accountId and r.code='CUSTOMER'
              )
              and (:q is null or a.phone like concat('%',:q,'%') or a.email like concat('%',:q,'%'))
            order by a.accountId
            """)
    org.springframework.data.domain.Page<Account> findCustomers(
            @Param("q") String q, org.springframework.data.domain.Pageable pageable);

    @Query(
            """
            select a from Account a
            where a.accountId=:id and a.deletedAt is null
              and exists (
                  select ar from AccountRole ar join Role r on r.roleId=ar.roleId
                  where ar.accountId=a.accountId and r.code='CUSTOMER'
              )
            """)
    Optional<Account> findCustomerById(@Param("id") Long id);

    Optional<Account> findByPhone(String phone);

    @Query("select a from Account a where a.phone in :phones and a.deletedAt is null")
    List<Account> findByPhoneInAndNotDeleted(@Param("phones") Collection<String> phones);

    /**
     * Có cả tài khoản xóa mềm để kiểm tra danh tính cũ khi khởi tạo; không dùng để xét số điện thoại
     * còn trống.
     */
    List<Account> findByPhoneIn(Collection<String> phones);

    @Query(
            """
            select case when count(a) > 0 then true else false end
            from Account a
            where a.phone in :phones and a.deletedAt is null
            """)
    boolean existsByPhoneInAndNotDeleted(@Param("phones") Collection<String> phones);

    /** Tra cả lịch sử xóa mềm khi nghiệp vụ cần đối chiếu danh tính cũ. */
    boolean existsByPhoneIn(Collection<String> phones);

    /**
     * Loại trừ tài khoản đang sửa nhưng vẫn xét lịch sử; kiểm tra số điện thoại còn trống dùng truy
     * vấn chưa xóa.
     */
    boolean existsByPhoneInAndAccountIdNot(Collection<String> phones, Long accountId);

    @Query(
            """
            select case when count(a) > 0 then true else false end
            from Account a
            where a.phone in :phones and a.deletedAt is null and a.accountId <> :accountId
            """)
    boolean existsByPhoneInAndNotDeletedAndAccountIdNot(
            @Param("phones") Collection<String> phones, @Param("accountId") Long accountId);

    boolean existsByPhone(String phone);

    boolean existsByPhoneAndAccountIdNot(String phone, Long accountId);

    @Query(
            """
            select a from Account a
            where a.deletedAt is null
              and exists (
                  select ar from AccountRole ar join Role r on r.roleId=ar.roleId
                  where ar.accountId=a.accountId and r.code in ('ADMIN','SUPERADMIN')
                    and r.status='ACTIVE'
              )
              and (:q is null or a.phone like concat('%',:q,'%') or a.email like concat('%',:q,'%'))
              and (:roleId is null or exists (
                  select ar from AccountRole ar
                  where ar.accountId=a.accountId and ar.roleId=:roleId
              ))
            order by a.accountId
            """)
    org.springframework.data.domain.Page<Account> findStaff(
            @Param("q") String q,
            @Param("roleId") Long roleId,
            org.springframework.data.domain.Pageable pageable);
}
