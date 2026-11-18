package com.fido.modules.cart.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "carts")
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

    @Column(name = "status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String status = "OPEN";

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public void complete() {
        if (!"OPEN".equals(status)) {
            throw BusinessRuleException.conflict("CONFLICT");
        }
        status = "COMPLETED";
    }

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
