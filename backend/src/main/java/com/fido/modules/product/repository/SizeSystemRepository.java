package com.fido.modules.product.repository;

import com.fido.modules.product.entity.SizeSystem;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface SizeSystemRepository extends Repository<SizeSystem, Long> {
    Optional<SizeSystem> findById(Long id);
    SizeSystem save(SizeSystem entity);
}
