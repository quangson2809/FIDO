package com.fido.modules.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "attribute_options",
        uniqueConstraints = {
            @UniqueConstraint(name = "uq_attribute_options_value", columnNames = {"attribute_id", "value"}),
            @UniqueConstraint(name = "uq_attribute_options_id_attribute", columnNames = {"id", "attribute_id"})
        })
@Getter
@Setter
@NoArgsConstructor
public class AttributeOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long attributeOptionId;

    @Column(name = "attribute_id", nullable = false)
    private Long attributeId;

    @Column(name = "\u0060value\u0060", nullable = false, length = 120)
    private String value;

    @Column(name = "label", nullable = false, length = 150)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
