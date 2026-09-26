package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Inventory;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface InventoryRepository extends Repository<Inventory, Long> {
    Optional<Inventory> findById(Long id);
    List<Inventory> findAllByVariantIdIn(Collection<Long> variantIds);
    Inventory save(Inventory entity);
}
