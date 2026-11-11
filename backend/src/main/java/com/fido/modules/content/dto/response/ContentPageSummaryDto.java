package com.fido.modules.content.dto.response;

import java.time.LocalDateTime;

public record ContentPageSummaryDto(
        Long id,
        String slug,
        String title,
        String status,
        LocalDateTime updated_at) {}
