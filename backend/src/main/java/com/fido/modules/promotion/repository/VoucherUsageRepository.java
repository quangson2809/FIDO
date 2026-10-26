package com.fido.modules.promotion.repository;

import com.fido.modules.promotion.entity.VoucherUsage;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Reads voucher usage from orders.voucher_id/account_id. A separate voucher_usages
 * table is deliberately absent from the canonical schema.
 */
@Repository
@Transactional
public class VoucherUsageRepository {
    @PersistenceContext
    private EntityManager entityManager;

    public List<VoucherUsage> activeForUpdate(Long voucherId) {
        return entityManager.createQuery(
                        "select u from VoucherUsage u where u.voucherId = :voucherId and u.restored = false",
                        VoucherUsage.class)
                .setParameter("voucherId", voucherId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultList();
    }

    public interface UsageCounts {
        Long getVoucherId();
        long getTotalCount();
        long getActiveCount();
    }

    public static final class UsageCountsRow implements UsageCounts {
        private final Long voucherId;
        private final long totalCount;
        private final long activeCount;
        public UsageCountsRow(Long voucherId, long totalCount, long activeCount) {
            this.voucherId = voucherId;
            this.totalCount = totalCount;
            this.activeCount = activeCount;
        }
        @Override public Long getVoucherId() { return voucherId; }
        @Override public long getTotalCount() { return totalCount; }
        @Override public long getActiveCount() { return activeCount; }
    }

    public List<UsageCounts> summarize(Collection<Long> voucherIds) {
        if (voucherIds == null || voucherIds.isEmpty()) return List.of();
        List<Object[]> rows = entityManager.createQuery(
                "select u.voucherId, count(u), " +
                "sum(case when u.restored = false then 1L else 0L end) " +
                "from VoucherUsage u where u.voucherId in :voucherIds group by u.voucherId",
                Object[].class)
                .setParameter("voucherIds", voucherIds)
                .getResultList();
        List<UsageCounts> result = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            result.add(new UsageCountsRow(
                    (Long) row[0],
                    ((Number) row[1]).longValue(),
                    row[2] == null ? 0L : ((Number) row[2]).longValue()));
        }
        return result;
    }

    /** The order row is created by OrderCreationService before this compatibility hook. */
    public VoucherUsage save(VoucherUsage usage) {
        return usage;
    }

    public Optional<VoucherUsage> findById(Long orderId) {
        return Optional.ofNullable(entityManager.find(VoucherUsage.class, orderId));
    }

    public long countByVoucherIdAndRestoredFalse(Long voucherId) {
        return entityManager.createQuery(
                        "select count(u) from VoucherUsage u where u.voucherId = :voucherId and u.restored = false",
                        Long.class)
                .setParameter("voucherId", voucherId)
                .getSingleResult();
    }

    public long countByVoucherIdAndAccountIdAndRestoredFalse(Long voucherId, Long accountId) {
        return entityManager.createQuery(
                        "select count(u) from VoucherUsage u where u.voucherId = :voucherId and u.accountId = :accountId and u.restored = false",
                        Long.class)
                .setParameter("voucherId", voucherId)
                .setParameter("accountId", accountId)
                .getSingleResult();
    }

    public boolean existsByVoucherId(Long voucherId) {
        return entityManager.createQuery(
                        "select count(u) from VoucherUsage u where u.voucherId = :voucherId",
                        Long.class)
                .setParameter("voucherId", voucherId)
                .getSingleResult() > 0;
    }
}
