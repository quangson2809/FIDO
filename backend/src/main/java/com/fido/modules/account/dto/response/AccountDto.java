package com.fido.modules.account.dto.response;

import java.time.LocalDateTime;

public record AccountDto(
        Long id,
        String full_name,
        String phone,
        String email,
        String status,
        LocalDateTime created_at,
        LocalDateTime updated_at,
        boolean email_verified) {
    public AccountDto(
            Long id,
            String full_name,
            String phone,
            String email,
            String status,
            LocalDateTime created_at,
            LocalDateTime updated_at) {
        this(id, full_name, phone, email, status, created_at, updated_at, false);
    }
}
