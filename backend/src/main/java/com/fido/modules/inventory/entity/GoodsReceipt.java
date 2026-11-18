package com.fido.modules.inventory.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "goods_receipts",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uq_goods_receipts_number",
                        columnNames = {"receipt_number"}))
@Getter
@Setter
@NoArgsConstructor
public class GoodsReceipt {
    public static final String DRAFT = "DRAFT";
    public static final String CONFIRMED = "CONFIRMED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long receiptId;

    @Column(name = "receipt_number", nullable = false, length = 40)
    private String receiptCode;

    @Column(name = "supplier_id", nullable = false)
    @Setter(AccessLevel.NONE)
    private Long supplierId;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(name = "status", nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    private String receiptStatus = "DRAFT";

    @Column(name = "created_by", nullable = false)
    private Long createdByAccountId;

    @Column(name = "confirmed_by")
    @Setter(AccessLevel.NONE)
    private Long confirmedByAccountId;

    @Column(name = "confirmed_at", columnDefinition = "TIMESTAMP(6)")
    @Setter(AccessLevel.NONE)
    private LocalDateTime confirmedAt;

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public void requireEditable() {
        if (!DRAFT.equals(receiptStatus)) {
            throw BusinessRuleException.conflict("GOODS_RECEIPT_INVALID_STATE");
        }
    }

    public void changeSupplier(Long supplierId) {
        requireEditable();
        if (supplierId == null || supplierId <= 0) {
            throw BusinessRuleException.invalid("VALIDATION_ERROR");
        }
        this.supplierId = supplierId;
    }

    public void confirm(Long actor, LocalDateTime now) {
        requireEditable();
        if (actor == null || actor <= 0 || now == null) {
            throw BusinessRuleException.invalid("VALIDATION_ERROR");
        }
        receiptStatus = CONFIRMED;
        confirmedByAccountId = actor;
        confirmedAt = now;
        updatedAt = now;
    }

    public void cancel(LocalDateTime now) {
        requireEditable();
        if (now == null) throw BusinessRuleException.invalid("VALIDATION_ERROR");
        receiptStatus = CANCELLED;
        updatedAt = now;
    }

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
