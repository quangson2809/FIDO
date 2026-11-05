package com.fido.modules.product.repository;

import com.fido.modules.product.entity.ProductAttributeValue;
import com.fido.modules.product.entity.ProductAttributeValueId;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/** Persistence projection for the immutable Product-attribute facts copied into an Order. */
public interface ProductAttributeSnapshotRepository
        extends Repository<ProductAttributeValue, ProductAttributeValueId> {

    @Query(value = """
            select pav.product_id as productId,
                   pav.attribute_id as attributeId,
                   a.code as attributeCode,
                   a.name as attributeName,
                   at.data_type as dataType,
                   ao.`value` as optionValue,
                   ao.label as optionLabel,
                   pav.text_value as textValue,
                   pav.number_value as numberValue,
                   pav.boolean_value as booleanValue
            from product_attribute_values pav
            join attributes a on a.id = pav.attribute_id
            join attribute_types at on at.id = a.attribute_type_id
            left join attribute_options ao
                on ao.id = pav.option_id and ao.attribute_id = pav.attribute_id
            where pav.product_id in (:productIds)
            order by pav.product_id asc, a.sort_order asc, pav.attribute_id asc
            """, nativeQuery = true)
    List<SnapshotRow> findSnapshotsByProductIds(@Param("productIds") Collection<Long> productIds);

    interface SnapshotRow {
        Long getProductId();
        Long getAttributeId();
        String getAttributeCode();
        String getAttributeName();
        String getDataType();
        String getOptionValue();
        String getOptionLabel();
        String getTextValue();
        Object getNumberValue();
        Object getBooleanValue();
    }
}
