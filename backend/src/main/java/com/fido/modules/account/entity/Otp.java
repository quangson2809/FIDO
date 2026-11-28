package com.fido.modules.account.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor
public class Otp {
    private final long accountId;
    private final String email;
    private final String code;
    private final Instant expiresAt;

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }
}
