package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Product;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface ProductRepository extends Repository<Product, Long> {
    Optional<Product> findById(Long id);
    Product save(Product entity);
}
