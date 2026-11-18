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
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long roleId;

    @Column(name = "code", nullable = false, length = 80)
    @Setter(AccessLevel.NONE)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", nullable = true, length = 500)
    private String description;

    @Column(name = "status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String status = "ACTIVE";

    public static Role create(String code, String name, String description) {
        Role role = new Role();
        role.code = code;
        role.name = name;
        role.description = description;
        return role;
    }

    public void changeStatus(String status) {
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw BusinessRuleException.invalid("VALIDATION_ERROR");
        }
        if ("SUPERADMIN".equals(code) && !"ACTIVE".equals(status)) {
            throw BusinessRuleException.conflict("SYSTEM_ROLE_PROTECTED");
        }
        this.status = status;
    }
}
