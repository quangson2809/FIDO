package com.fido.modules.order.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "checkout_quotes")
@Getter
@Setter
public class CheckoutQuote {
    @Id
    @Column(name = "quote_id", length = 36, nullable = false)
    private String quoteId;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "fingerprint", nullable = false, length = 64)
    private String fingerprint;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "order_id")
    private Long orderId;
}
