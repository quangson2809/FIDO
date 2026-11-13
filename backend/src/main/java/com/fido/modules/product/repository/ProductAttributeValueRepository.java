package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.entity.ProductAttributeValueId;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface ProductAttributeValueRepository
        extends Repository<ProductAttributeValue, ProductAttributeValueId> {
    List<ProductAttributeValue> findAllByProductIdOrderByAttributeIdAsc(Long productId);
    List<ProductAttributeValue> findAllByProductIdInOrderByProductIdAscAttributeIdAsc(
            Collection<Long> productIds);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_READ)
    @Query("select v from ProductAttributeValue v where v.productId in :ids order by v.productId, v.attributeId")
    List<ProductAttributeValue> findForFamilyValidation(@Param("ids") Collection<Long> ids);

    ProductAttributeValue save(ProductAttributeValue entity);
    void deleteAllByProductId(Long productId);

    // Load the whole checkout selection at once; services consume named fields, not SQL column positions.
    @Query(value = """
            select pav.product_id as productId, pav.attribute_id as attributeId,
                   a.code as attributeCode, a.name as attributeName,
                   pav.option_id as optionId, ao.`value` as optionValue, ao.label as optionLabel
            from product_attribute_values pav
            join attributes a on a.id = pav.attribute_id
            join attribute_options ao
                on ao.id = pav.option_id and ao.attribute_id = pav.attribute_id
            where pav.product_id in (:productIds)
            order by pav.product_id asc, a.sort_order asc, pav.attribute_id asc
            """, nativeQuery = true)
    List<OrderSnapshotValue> findOrderSnapshots(@Param("productIds") Collection<Long> productIds);

    interface OrderSnapshotValue {
        Long getProductId();
        Long getAttributeId();
        String getAttributeCode();
        String getAttributeName();
        Long getOptionId();
        String getOptionValue();
        String getOptionLabel();
    }

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
