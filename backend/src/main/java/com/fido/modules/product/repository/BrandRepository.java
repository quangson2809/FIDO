package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Brand;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface BrandRepository extends Repository<Brand, Long> {
    Optional<Brand> findById(Long id);
    Brand save(Brand entity);
}
