package com.fido.modules.order.entity;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class CheckoutQuote {
    private String quoteId;

private Long accountId;

private String fingerprint;

private Instant expiresAt;

private Long orderId;
}
