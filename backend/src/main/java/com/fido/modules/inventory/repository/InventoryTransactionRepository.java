package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.InventoryTransaction;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

/**
 * InventoryTransaction is an immutable ledger.
 * No update/delete operation is exposed.
 */
public interface InventoryTransactionRepository
        extends Repository<InventoryTransaction, Long>,
        JpaSpecificationExecutor<InventoryTransaction> {

    Optional<InventoryTransaction> findById(Long id);

    InventoryTransaction save(InventoryTransaction entity);

    boolean existsByOrderIdAndTransactionType(
            Long orderId,
            String transactionType
    );
}
