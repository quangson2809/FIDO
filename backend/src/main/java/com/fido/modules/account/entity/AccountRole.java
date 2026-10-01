package com.fido.modules.account.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "account_roles")
@Getter
@Setter
@NoArgsConstructor
@IdClass(AccountRoleId.class)
public class AccountRole {

    @Id
    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Id
    @Column(name = "role_id", nullable = false)
    private Long roleId;
}
