package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductImage;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface ProductImageRepository extends Repository<ProductImage, Long> {
    Optional<ProductImage> findById(Long id);
    ProductImage save(ProductImage entity);
    void delete(ProductImage entity);
    void flush();
    List<ProductImage> findAllByProductIdOrderBySortOrderAsc(Long productId);
    void deleteAllByProductId(Long productId);

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
              and image.sortOrder = (
                  select min(candidate.sortOrder)
                  from ProductImage candidate
                  where candidate.productId = image.productId
              )
            """)
    List<ProductRepresentativeImageView> findRepresentativeImagesByProductIdIn(
            @Param("productIds") Collection<Long> productIds
    );
}
