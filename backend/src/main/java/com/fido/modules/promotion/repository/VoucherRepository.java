package com.fido.modules.promotion.repository;

import com.fido.modules.promotion.entity.Voucher;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VoucherRepository extends Repository<Voucher, Long> {
    Optional<Voucher> findById(Long id);

    Voucher save(Voucher voucher);

    Page<Voucher> findByCodeContainingIgnoreCase(String code, Pageable pageable);

    boolean existsByCodeIgnoreCaseAndVoucherIdNot(String code, Long id);

    Optional<Voucher> findByCodeIgnoreCase(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Voucher v where v.voucherId = :id")
    Optional<Voucher> lockById(@Param("id") Long id);

    @Modifying
    @Query("update Voucher v set v.usageCount = v.usageCount + 1 where v.voucherId = :id and (v.usageLimit is null or v.usageCount < v.usageLimit)")
    int incrementUsageCountIfAvailable(@Param("id") Long id);

    @Modifying
    @Query("update Voucher v set v.usageCount = v.usageCount - 1 where v.voucherId = :id and v.usageCount > :minimumCount")
    int decrementUsageCountAbove(@Param("id") Long id, @Param("minimumCount") int minimumCount);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Voucher v where lower(v.code) = lower(:code)")
    Optional<Voucher> lockByCode(@Param("code") String code);
}
