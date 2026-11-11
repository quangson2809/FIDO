package com.fido.modules.content.dto.response;

import java.time.LocalDateTime;

public record ContentPageDto(
        Long id,
        String slug,
        String title,
        String content,
        String status,
        Long updated_by_account_id,
        LocalDateTime updated_at) {}
