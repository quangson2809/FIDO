package com.fido.modules.account.dto.response;
import java.time.LocalDateTime;
public record CustomerSummaryDto(Long account_id, String phone, String email,
        long order_count, LocalDateTime last_order_at) {}
