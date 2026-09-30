package com.fido.modules.audit.service;

import java.util.Objects;

public record AuditEvent(
        Long actorAccountId,
        AuditAction action,
        AuditTargetType targetType,
        Long targetId,
        String description
) {

    public AuditEvent {
        Objects.requireNonNull(actorAccountId, "actorAccountId");
        Objects.requireNonNull(action, "action");
        Objects.requireNonNull(targetType, "targetType");
        Objects.requireNonNull(targetId, "targetId");
    }

    public static AuditEvent of(
            Long actorAccountId,
            AuditAction action,
            AuditTargetType targetType,
            Long targetId
    ) {
        return new AuditEvent(
                actorAccountId,
                action,
                targetType,
                targetId,
                null
        );
    }

    public static AuditEvent described(
            Long actorAccountId,
            AuditAction action,
            AuditTargetType targetType,
            Long targetId,
            String description
    ) {
        return new AuditEvent(
                actorAccountId,
                action,
                targetType,
                targetId,
                description
        );
    }
}
