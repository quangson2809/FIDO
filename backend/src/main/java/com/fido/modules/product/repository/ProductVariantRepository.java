package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductVariant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface ProductVariantRepository extends Repository<ProductVariant, Long> {
    Optional<ProductVariant> findById(Long id);
    Optional<ProductVariant> findByVariantIdAndProductId(Long variantId, Long productId);
    ProductVariant save(ProductVariant entity);
    List<ProductVariant> findAllByProductIdOrderByVariantIdAsc(Long productId);
    List<ProductVariant> findAllByVariantIdIn(Collection<Long> variantIds);
    boolean existsByProductIdAndSizeValueIdAndColorId(Long productId, Long sizeValueId, Long colorId);
    boolean existsBySizeValueId(Long sizeValueId);
    boolean existsByColorId(Long colorId);
}
