package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductImage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface ProductImageRepository extends Repository<ProductImage, Long> {
    Optional<ProductImage> findById(Long id);
    ProductImage save(ProductImage entity);
    List<ProductImage> findAllByProductIdOrderByImageIdAsc(Long productId);
    void deleteAllByProductId(Long productId);
}
