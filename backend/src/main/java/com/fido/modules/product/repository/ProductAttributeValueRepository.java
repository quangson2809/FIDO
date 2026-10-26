package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.entity.ProductAttributeValueId;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface ProductAttributeValueRepository
        extends Repository<ProductAttributeValue, ProductAttributeValueId> {

    @Query("""
            select case when count(product) > 0 then true else false end
            from Product product
            where product.status = 'ACTIVE'
              and product.deletedAt is null
              and not exists (
                  select attributeValue.productId
                  from ProductAttributeValue attributeValue
                  where attributeValue.productId = product.productId
                    and attributeValue.attributeId = :attributeId
                    and (
                        (:dataType = 'OPTION'
                            and attributeValue.optionId is not null
                            and attributeValue.textValue is null
                            and attributeValue.numberValue is null
                            and attributeValue.booleanValue is null)
                        or (:dataType = 'TEXT'
                            and attributeValue.optionId is null
                            and attributeValue.textValue is not null
                            and attributeValue.numberValue is null
                            and attributeValue.booleanValue is null)
                        or (:dataType = 'NUMBER'
                            and attributeValue.optionId is null
                            and attributeValue.textValue is null
                            and attributeValue.numberValue is not null
                            and attributeValue.booleanValue is null)
                        or (:dataType = 'BOOLEAN'
                            and attributeValue.optionId is null
                            and attributeValue.textValue is null
                            and attributeValue.numberValue is null
                            and attributeValue.booleanValue is not null)
                    )
              )
            """)
    boolean existsActiveProductMissingCompatibleValue(
            @Param("attributeId") Long attributeId, @Param("dataType") String dataType);
}
