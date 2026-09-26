package com.fido.modules.product.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "size_values", uniqueConstraints = {@UniqueConstraint(columnNames = {"size_system_id", "code"})})
@Getter
@Setter
@NoArgsConstructor
public class SizeValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "size_value_id", nullable = false)
    private Long sizeValueId;

    @Column(name = "size_system_id", nullable = false)
    private Long sizeSystemId;

    @Column(name = "code", nullable = false, length = 50)
    private String code;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
