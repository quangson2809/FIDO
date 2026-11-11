package com.fido.modules.audit.dto.response;
import java.time.LocalDateTime;
import java.util.Map;
public record AuditLogDto(
        Long id,
        Long actor_account_id,
        String action,
        String entity_type,
        String entity_id,
        Map<String,Object> before_data,
        Map<String,Object> after_data,
        String correlation_id,
        LocalDateTime created_at) {}
