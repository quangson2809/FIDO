package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Supplier;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

/**
 * Supplier history is preserved through usage status.
 * No delete operation is exposed by the baseline API.
 */
public interface SupplierRepository
        extends Repository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {

    Optional<Supplier> findById(Long id);

    Supplier save(Supplier entity);
}
