package com.fido.modules.audit.dto.response;
import java.time.LocalDateTime;
public record AuditLogDto(Long audit_id, Long actor_account_id, String action, String target_type,
        String target_id, String description, LocalDateTime created_at) {}
