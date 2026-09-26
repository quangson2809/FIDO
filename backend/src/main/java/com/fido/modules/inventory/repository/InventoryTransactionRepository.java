package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.InventoryTransaction;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface InventoryTransactionRepository extends Repository<InventoryTransaction, Long> {
    Optional<InventoryTransaction> findById(Long id);
    InventoryTransaction save(InventoryTransaction entity);
}
