package com.fido.modules.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "goods_receipts",
        uniqueConstraints = @UniqueConstraint(name = "uq_goods_receipts_number", columnNames = {"receipt_number"}))
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
    private String receiptStatus = "DRAFT";

    @Column(name = "created_by", nullable = false)
    private Long createdByAccountId;

    @Column(name = "confirmed_by")
    private Long confirmedByAccountId;

    @Column(name = "confirmed_at", columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime confirmedAt;

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
        if (receiptStatus == null) receiptStatus = "DRAFT";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
