package com.fido.modules.promotion.repository;
import com.fido.modules.promotion.entity.VoucherUsage;
import java.util.Optional;
import org.springframework.data.repository.Repository;
public interface VoucherUsageRepository extends Repository<VoucherUsage, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from VoucherUsage u where u.voucherId = :voucherId and u.restored = false")
    java.util.List<VoucherUsage> activeForUpdate(@org.springframework.data.repository.query.Param("voucherId") Long voucherId);
    interface UsageCounts {
        Long getVoucherId();
        long getTotalCount();
        long getActiveCount();
    }

    @org.springframework.data.jpa.repository.Query("""
            select u.voucherId as voucherId,
                   count(u) as totalCount,
                   sum(case when u.restored = false then 1L else 0L end) as activeCount
            from VoucherUsage u
            where u.voucherId in :voucherIds
            group by u.voucherId
            """)
    java.util.List<UsageCounts> summarize(
            @org.springframework.data.repository.query.Param("voucherIds") java.util.Collection<Long> voucherIds);

    Optional<VoucherUsage> findById(Long orderId);
    VoucherUsage save(VoucherUsage usage);
    long countByVoucherIdAndRestoredFalse(Long voucherId);
    long countByVoucherIdAndAccountIdAndRestoredFalse(Long voucherId, Long accountId);
    boolean existsByVoucherId(Long voucherId);
}
