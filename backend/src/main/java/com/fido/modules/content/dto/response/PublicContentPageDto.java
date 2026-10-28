package com.fido.modules.content.dto.response;

import java.time.LocalDateTime;

public record PublicContentPageDto(
        String slug, String title, String content, LocalDateTime updated_at) {}
