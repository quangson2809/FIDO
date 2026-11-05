package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.entity.ProductAttributeValueId;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ProductAttributeValueRepository
        extends Repository<ProductAttributeValue, ProductAttributeValueId> {

    List<ProductAttributeValue> findAllByProductIdOrderByAttributeIdAsc(Long productId);

    ProductAttributeValue save(ProductAttributeValue entity);

    void deleteAllByProductId(Long productId);

    @Query("""
            select attribute.attributeId as attributeId,
                   attribute.code as attributeCode,
                   attribute.name as attributeName,
                   attributeType.code as typeCode,
                   attributeType.dataType as dataType,
                   attributeValue.optionId as optionId,
                   attributeOption.value as optionValue,
                   attributeOption.label as optionLabel,
                   attributeValue.textValue as textValue,
                   attributeValue.numberValue as numberValue,
                   attributeValue.booleanValue as booleanValue
            from ProductAttributeValue attributeValue
            join Attribute attribute on attribute.attributeId = attributeValue.attributeId
            join AttributeType attributeType
                on attributeType.attributeTypeId = attribute.attributeTypeId
            left join AttributeOption attributeOption
                on attributeOption.attributeOptionId = attributeValue.optionId
                and attributeOption.attributeId = attributeValue.attributeId
            where attributeValue.productId = :productId
            order by attribute.attributeId asc
            """)
    List<AttributeValueReadRow> findAttributeValuesForProduct(
            @Param("productId") Long productId);

    interface AttributeValueReadRow {
        Long getAttributeId();
        String getAttributeCode();
        String getAttributeName();
        String getTypeCode();
        String getDataType();
        Long getOptionId();
        String getOptionValue();
        String getOptionLabel();
        String getTextValue();
        BigDecimal getNumberValue();
        Boolean getBooleanValue();
    }

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
