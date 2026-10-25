package com.fido.modules.account.dto.response;

import java.time.LocalDateTime;

public record AccountDto(
        Long account_id,
        String full_name,
        String phone,
        String email,
        String status,
        LocalDateTime created_at,
        LocalDateTime updated_at) {}
