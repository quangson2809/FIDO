package com.fido.modules.account.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long accountId;

    // Legacy runtime migrations can contain accounts without a backfillable name.
    // The isolated clean-target DDL enforces NOT NULL and is verified separately.
    @Column(name = "full_name", nullable = true, length = 150)
    private String fullName;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    // Legacy runtime schema still allows NULL until a safe account data disposition exists.
    // New commands require phone; clean-target DDL enforces NOT NULL.
    @Column(name = "phone", nullable = true, length = 20)
    private String phone;

    @Column(name = "phone_active_key", insertable = false, updatable = false, length = 20)
    private String phoneActiveKey;

    @Column(name = "email", nullable = true, length = 254)
    private String email;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "deleted_at", columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime deletedAt;

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public boolean isActive() {
        return "ACTIVE".equals(status) && deletedAt == null;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (status == null) {
            status = "ACTIVE";
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
