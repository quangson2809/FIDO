package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductImage;
<<<<<<< HEAD
import java.util.List;
import java.util.Optional;
=======
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
import org.springframework.data.repository.Repository;

public interface ProductImageRepository extends Repository<ProductImage, Long> {
    Optional<ProductImage> findById(Long id);
    ProductImage save(ProductImage entity);
    void delete(ProductImage entity);
    void flush();
    List<ProductImage> findAllByProductIdOrderBySortOrderAsc(Long productId);
    void deleteAllByProductId(Long productId);
<<<<<<< HEAD
=======

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select image
            from ProductImage image
            where image.productId = :productId
            order by image.sortOrder asc, image.imageId asc
            """)
    List<ProductImage> findAllByProductIdForUpdate(
            @Param("productId") Long productId
    );

    @Query("""
            select image.productId as productId,
                   image.imageUrl as imageUrl
            from ProductImage image
            where image.productId in :productIds
              and image.sortOrder = 0
            """)
    List<ProductRepresentativeImageView> findRepresentativeImagesByProductIdIn(
            @Param("productIds") Collection<Long> productIds
    );
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
}
