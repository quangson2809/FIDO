package com.fido.modules.cart.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "carts",
        uniqueConstraints =
                @UniqueConstraint(name = "uq_carts_account", columnNames = "account_id"))
@Getter
@Setter
@NoArgsConstructor
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long cartId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
