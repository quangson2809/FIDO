package com.fido.modules.content.dto.response;
import java.time.LocalDateTime;
public record ContentPageDto(Long page_id, String page_code, String title, String content,
        Long updated_by_account_id, LocalDateTime updated_at) {}
