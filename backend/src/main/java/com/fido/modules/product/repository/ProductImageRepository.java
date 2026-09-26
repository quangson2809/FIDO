package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductImage;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface ProductImageRepository extends Repository<ProductImage, Long> {
    Optional<ProductImage> findById(Long id);
    ProductImage save(ProductImage entity);
}
