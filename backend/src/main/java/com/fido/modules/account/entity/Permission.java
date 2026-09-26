package com.fido.modules.account.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "permissions", uniqueConstraints = {@UniqueConstraint(columnNames = {"code"})})
@Getter
@Setter
@NoArgsConstructor
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "permission_id", nullable = false)
    private Long permissionId;

    @Column(name = "code", nullable = false, length = 120)
    private String code;

    @Column(name = "name", nullable = false, length = 200)
    private String name;
}
