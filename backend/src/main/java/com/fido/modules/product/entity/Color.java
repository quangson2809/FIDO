package com.fido.modules.product.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "attribute_options")
@Getter
@Setter
@NoArgsConstructor
public class Color {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long colorId;

    @Column(name = "`value`", nullable = false, length = 120)
    private String code;

    @Column(name = "label", nullable = false, length = 150)
    private String name;

    @Column(name = "attribute_id", nullable = false)
    private Long attributeId;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
