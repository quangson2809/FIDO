package com.fido.modules.account.dto.response;

import java.time.LocalDateTime;

public record AccountDto(Long account_id, String phone, String email,
                         LocalDateTime created_at, LocalDateTime updated_at) {}
