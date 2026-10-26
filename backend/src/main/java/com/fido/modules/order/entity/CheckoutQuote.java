package com.fido.modules.order.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class CheckoutQuote {
@Column(name = "quote_id", length = 36, nullable = false)
    private String quoteId;

private Long accountId;

private String fingerprint;

private Instant expiresAt;

private Long orderId;
}
