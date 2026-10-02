package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductImage;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface ProductImageRepository extends Repository<ProductImage, Long> {
    Optional<ProductImage> findById(Long id);
    ProductImage save(ProductImage entity);
    List<ProductImage> findAllByProductIdOrderBySortOrderAsc(Long productId);
    void deleteAllByProductId(Long productId);

    @Query("""
            select pi.productId as productId,
                   pi.imageUrl as imageUrl
            from ProductImage pi
            where pi.productId in :productIds
              and pi.sortOrder = 0
            """)
    List<ProductPrimaryImageView> findPrimaryImagesByProductIdIn(
            @Param("productIds") Collection<Long> productIds
    );
}
