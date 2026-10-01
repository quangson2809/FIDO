package com.fido.modules.inventory.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "goods_receipts", uniqueConstraints = {@UniqueConstraint(columnNames = {"receipt_code"})})
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "receipt_code", nullable = false, length = 40)
    private String receiptCode;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "receipt_status", nullable = false, length = 20)
    private String receiptStatus;

    @Column(name = "receipt_date", nullable = false)
    private LocalDate receiptDate;

    @Column(name = "created_by_account_id", nullable = false)
    private Long createdByAccountId;

    @Column(name = "confirmed_by_account_id", nullable = true)
    private Long confirmedByAccountId;

    @Column(name = "confirmed_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime confirmedAt;

    @Column(name = "note", nullable = true, columnDefinition = "TEXT")
    private String note;

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
}
