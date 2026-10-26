package com.fido.modules.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "product_attribute_values")
@IdClass(ProductAttributeValueId.class)
@Getter
@Setter
@NoArgsConstructor
public class ProductAttributeValue {
    @Id
    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Id
    @Column(name = "attribute_id", nullable = false)
    private Long attributeId;

    @Column(name = "option_id")
    private Long optionId;

    @Column(name = "text_value", length = 1000)
    private String textValue;

    @Column(name = "number_value", precision = 18, scale = 4)
    private BigDecimal numberValue;

    @Column(name = "boolean_value")
    private Boolean booleanValue;
}
