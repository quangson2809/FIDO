package com.fido.modules.product.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "attributes")
@Getter
@Setter
@NoArgsConstructor
public class SizeValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long sizeValueId;

    @Column(name = "attribute_type_id", nullable = false)
    private Long sizeSystemId;

    @Column(name = "code", nullable = false, length = 80)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String displayName;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "is_required", nullable = false)
    private boolean required = false;

    @Column(name = "is_variant_defining", nullable = false)
    private boolean variantDefining = true;
}
