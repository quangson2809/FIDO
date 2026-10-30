package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.entity.ProductAttributeValueId;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductAttributeValueRepository
        extends Repository<ProductAttributeValue, ProductAttributeValueId> {
    List<ProductAttributeValue> findAllByProductIdOrderByAttributeIdAsc(Long productId);
    ProductAttributeValue save(ProductAttributeValue entity);
    void deleteAllByProductId(Long productId);

    @Query("""
            select case when count(product) > 0 then true else false end
            from Product product
            where product.status = 'ACTIVE'
              and product.deletedAt is null
              and not exists (
                  select value.productId
                  from ProductAttributeValue value
                  where value.productId = product.productId
                    and value.attributeId = :attributeId
              )
            """)
    boolean existsActiveProductMissingAttributeValue(@Param("attributeId") Long attributeId);
}
