package com.fido.modules.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "suppliers")
@Getter
@Setter
@NoArgsConstructor
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "phone", nullable = true, length = 20)
    private String phone;

    @Column(name = "email", nullable = true, length = 254)
    private String email;

    @Column(name = "address", nullable = true, length = 500)
    private String address;

    @Column(name = "usage_status", nullable = false, length = 30)
    private String usageStatus;

    @Column(name = "note", nullable = true, length = 500)
    private String note;
}
