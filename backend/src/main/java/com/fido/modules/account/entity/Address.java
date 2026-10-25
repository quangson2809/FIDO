package com.fido.modules.account.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "addresses")
@Getter @Setter @NoArgsConstructor
public class Address {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    // Runtime V10 retains NULLs for historical free-text addresses. The clean-target schema
    // enforces NOT NULL; legacy rows must be fully replaced before structured writes.
    @Column(name = "recipient_name", nullable = true, length = 150)
    private String recipientName;
    @Column(name = "recipient_phone", nullable = true, length = 20)
    private String recipientPhone;
    @Column(name = "province", nullable = true, length = 120)
    private String province;
    @Column(name = "district", nullable = true, length = 120)
    private String district;
    @Column(name = "ward", nullable = true, length = 120)
    private String ward;
    @Column(name = "address_line", nullable = true, length = 500)
    private String addressLine;
    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
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
    public boolean hasStructuredAddress() {
        return recipientName != null && recipientPhone != null && province != null
                && district != null && ward != null && addressLine != null;
    }
}
