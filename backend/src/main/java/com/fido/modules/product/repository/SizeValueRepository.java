package com.fido.modules.product.repository;

import com.fido.modules.product.entity.SizeValue;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface SizeValueRepository extends Repository<SizeValue, Long> {
    Optional<SizeValue> findById(Long id);
    SizeValue save(SizeValue entity);
}
