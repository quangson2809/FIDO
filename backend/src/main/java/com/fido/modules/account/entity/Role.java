package com.fido.modules.account.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "roles",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"code"})})
@Getter
@Setter
@NoArgsConstructor
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long roleId;

    @Column(name = "code", nullable = false, length = 80)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", nullable = true, length = 500)
    private String description;

    @Column(name = "status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String status = "ACTIVE";

    public void changeStatus(String status) {
        if ("SUPERADMIN".equals(code) && !"ACTIVE".equals(status)) {
            throw BusinessRuleException.conflict("SYSTEM_ROLE_PROTECTED");
        }
        this.status = status;
    }
}
