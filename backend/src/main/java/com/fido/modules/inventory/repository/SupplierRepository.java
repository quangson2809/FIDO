package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Supplier;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface SupplierRepository extends Repository<Supplier, Long> {
    Optional<Supplier> findById(Long id);
    Supplier save(Supplier entity);
}
