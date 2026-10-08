package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.GoodsReceipt;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
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

}
