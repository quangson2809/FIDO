package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.GoodsReceipt;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Confirmed receipts are historical records.
 * No delete operation is exposed.
 */
public interface GoodsReceiptRepository
        extends Repository<GoodsReceipt, Long>, JpaSpecificationExecutor<GoodsReceipt> {

    Optional<GoodsReceipt> findById(Long id);

    GoodsReceipt save(GoodsReceipt entity);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select receipt
            from GoodsReceipt receipt
            where receipt.receiptId = :receiptId
            """)
    Optional<GoodsReceipt> findByIdForUpdate(
            @Param("receiptId") Long receiptId
    );

    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query("""
            update GoodsReceipt receipt
            set receipt.receiptStatus = 'CONFIRMED',
                receipt.confirmedByAccountId = :actor,
                receipt.confirmedAt = :confirmedAt,
                receipt.updatedAt = :confirmedAt
            where receipt.receiptId = :receiptId
              and receipt.receiptStatus = 'DRAFT'
            """)
    int confirmDraft(
            @Param("receiptId") Long receiptId,
            @Param("actor") Long actor,
            @Param("confirmedAt") LocalDateTime confirmedAt
    );

    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query("""
            update GoodsReceipt receipt
            set receipt.receiptStatus = 'CANCELLED',
                receipt.updatedAt = :updatedAt
            where receipt.receiptId = :receiptId
              and receipt.receiptStatus = 'DRAFT'
            """)
    int cancelDraft(
            @Param("receiptId") Long receiptId,
            @Param("updatedAt") LocalDateTime updatedAt
    );
}
