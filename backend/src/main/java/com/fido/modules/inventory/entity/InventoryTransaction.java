package com.fido.modules.inventory.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
@NoArgsConstructor
@Immutable
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)
    private Long txnId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private Long productId;

    @Column(name = "warehouse_id", nullable = false, updatable = false)
    private Long warehouseId;

    @Column(name = "quantity_delta", nullable = false, updatable = false)
    private Integer quantityDelta;

    @Column(name = "goods_receipt_item_id", updatable = false)
    private Long goodsReceiptItemId;

    @Column(name = "order_item_id", updatable = false)
    private Long orderItemId;

    @Column(name = "idempotency_key", nullable = false, length = 120, unique = true, updatable = false)
    private String idempotencyKey;

    @Column(name = "reverses_transaction_id", updatable = false)
    private Long reversesTransactionId;

    @Column(name = "transaction_type", nullable = false, length = 30, updatable = false)
    private String transactionType;

    @Column(name = "created_by", nullable = true, updatable = false)
    private Long actorAccountId;

    @Column(name = "reason_code", nullable = true, length = 80, updatable = false)
    private String reason;

    @Column(
            name = "created_at",
            nullable = false,
            columnDefinition = "TIMESTAMP(6)",
            updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
