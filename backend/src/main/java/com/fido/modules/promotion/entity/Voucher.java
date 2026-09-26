package com.fido.modules.promotion.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "vouchers", uniqueConstraints = {@UniqueConstraint(columnNames = {"code"})})
@Getter
@Setter
@NoArgsConstructor
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "voucher_id", nullable = false)
    private Long voucherId;

    @Column(name = "code", nullable = false, length = 80)
    private String code;
}
