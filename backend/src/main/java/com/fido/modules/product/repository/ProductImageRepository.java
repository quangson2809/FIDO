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
    List<ProductImage> findAllByProductIdOrderByImageIdAsc(Long productId);
    void deleteAllByProductId(Long productId);

    @Query("""
            select image.productId as productId,
                   image.imageUrl as imageUrl
            from ProductImage image
            where image.productId in :productIds
              and image.imageId = (
                  select min(candidate.imageId)
                  from ProductImage candidate
                  where candidate.productId = image.productId
              )
            """)
    List<ProductRepresentativeImageView> findRepresentativeImagesByProductIdIn(
            @Param("productIds") Collection<Long> productIds
    );
}
