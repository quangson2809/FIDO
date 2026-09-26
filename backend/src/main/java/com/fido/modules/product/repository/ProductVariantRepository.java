package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductVariant;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface ProductVariantRepository extends Repository<ProductVariant, Long> {
    Optional<ProductVariant> findById(Long id);
    ProductVariant save(ProductVariant entity);
}
