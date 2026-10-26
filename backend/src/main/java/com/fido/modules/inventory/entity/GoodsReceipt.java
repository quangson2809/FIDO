package com.fido.modules.inventory.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "goods_receipts")
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long receiptId;

    @Column(name = "receipt_number", nullable = false, length = 40)
    private String receiptCode;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "status", nullable = false, length = 20)
    private String receiptStatus;

    @Transient
    private LocalDate receiptDate;

    @Column(name = "created_by", nullable = false)
    private Long createdByAccountId;

    @Column(name = "confirmed_by", nullable = true)
    private Long confirmedByAccountId;

    @Column(name = "confirmed_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime confirmedAt;

    @Transient
    private String note;

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
