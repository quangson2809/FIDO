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
        name = "attributes",
        uniqueConstraints = @UniqueConstraint(name = "uq_attributes_code", columnNames = {"code"}))
@Getter
@Setter
@NoArgsConstructor
public class Attribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long attributeId;

    @Column(name = "attribute_type_id", nullable = false)
    private Long attributeTypeId;

    @Column(name = "code", nullable = false, length = 80)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "is_required", nullable = false)
    private boolean required = false;

    @Column(name = "is_variant_defining", nullable = false)
    private boolean variantDefining = false;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
