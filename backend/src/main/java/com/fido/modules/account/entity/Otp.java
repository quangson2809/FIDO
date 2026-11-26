package com.fido.modules.account.entity;

import java.time.Instant;

public record Otp(long accountId, String email, String code, Instant expiresAt) {
    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
