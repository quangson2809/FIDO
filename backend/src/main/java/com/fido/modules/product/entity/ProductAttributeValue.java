package com.fido.modules.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "product_attribute_values")
@IdClass(ProductAttributeValueId.class)
@Getter
@Setter
@NoArgsConstructor
public class ProductAttributeValue {
    @Id @Column(name = "product_id", nullable = false)
    private Long productId;
    @Id @Column(name = "attribute_id", nullable = false)
    private Long attributeId;
    @Column(name = "option_id", nullable = false)
    private Long optionId;
}
