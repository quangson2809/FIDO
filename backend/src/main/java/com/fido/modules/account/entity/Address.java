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

    // Kept only for legacy rows; new writes derive this compatibility value from structured fields.
    @Column(name = "address_text", nullable = false, length = 500)
    private String addressText;

    @Column(name = "recipient_name", length = 150)
    private String recipientName;
    @Column(name = "recipient_phone", length = 20)
    private String recipientPhone;
    @Column(name = "province", length = 120)
    private String province;
    @Column(name = "district", length = 120)
    private String district;
    @Column(name = "ward", length = 120)
    private String ward;
    @Column(name = "address_line", length = 500)
    private String addressLine;
    @Column(name = "is_default", nullable = false)
    private boolean isDefault;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", columnDefinition = "TIMESTAMP(6)")
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
