package com.fido.modules.audit.service;

import java.time.LocalDateTime;

public record AuditSearchFilter(
        Long actorAccountId,
        String action,
        String targetType,
        String targetId,
        LocalDateTime from,
        LocalDateTime to,
        Integer page,
        Integer pageSize
) {
}
