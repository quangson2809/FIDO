package com.fido.modules.order.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus;

    @Column(name = "amount_due", nullable = false, precision = 18, scale = 2)
    private BigDecimal amountDue;

    @Column(name = "amount_received", nullable = false, precision = 18, scale = 2)
    private BigDecimal amountReceived;

    @Column(name = "amount_refunded", nullable = false, precision = 18, scale = 2)
    private BigDecimal amountRefunded;

    @Column(name = "collected_by_account_id", nullable = true)
    private Long collectedByAccountId;

    @Column(name = "collected_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime collectedAt;

    @Column(name = "refunded_by_account_id", nullable = true)
    private Long refundedByAccountId;

    @Column(name = "refunded_at", nullable = true, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime refundedAt;
}
