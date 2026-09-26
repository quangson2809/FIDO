package com.fido.modules.inventory.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

@Entity
@Table(name = "inventory_transactions")
@Getter
@Setter
@NoArgsConstructor
@Immutable
public class InventoryTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "txn_id", nullable = false, updatable = false)
    private Long txnId;

    @Column(name = "variant_id", nullable = false, updatable = false)
    private Long variantId;

    @Column(name = "quantity_delta", nullable = false, updatable = false)
    private Integer quantityDelta;

    @Column(name = "transaction_type", nullable = false, length = 40, updatable = false)
    private String transactionType;

    @Column(name = "order_id", nullable = true, updatable = false)
    private Long orderId;

    @Column(name = "goods_receipt_id", nullable = true, updatable = false)
    private Long goodsReceiptId;

    @Column(name = "actor_account_id", nullable = false, updatable = false)
    private Long actorAccountId;

    @Column(name = "reason", nullable = true, length = 500, updatable = false)
    private String reason;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMP(6)", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        createdAt = now;
    }
}
