package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Inventory;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface InventoryRepository extends Repository<Inventory, Long> {
    Optional<Inventory> findById(Long id);
    Inventory save(Inventory entity);
}
