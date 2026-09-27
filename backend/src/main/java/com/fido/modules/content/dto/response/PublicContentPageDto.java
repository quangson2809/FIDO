package com.fido.modules.content.dto.response;
import java.time.LocalDateTime;
public record PublicContentPageDto(String page_code, String title, String content, LocalDateTime updated_at) {}
