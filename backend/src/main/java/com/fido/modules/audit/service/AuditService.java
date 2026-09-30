package com.fido.modules.audit.service;

import com.fido.modules.audit.entity.AuditLog;
import com.fido.modules.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository logs;

    public AuditService(AuditLogRepository logs) {
        this.logs = logs;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(AuditEvent event) {
        AuditLog log = new AuditLog();
        log.setActorAccountId(event.actorAccountId());
        log.setAction(event.action().name());
        log.setTargetType(event.targetType().name());
        log.setTargetId(event.targetId().toString());
        log.setDescription(event.description());

        logs.save(log);
    }

    @Deprecated(forRemoval = true)
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(
            Long actor,
            String action,
            String targetType,
            Long targetId
    ) {
        record(
                AuditEvent.of(
                        actor,
                        AuditAction.valueOf(action),
                        AuditTargetType.valueOf(targetType),
                        targetId
                )
        );
    }

    @Deprecated(forRemoval = true)
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(
            Long actor,
            String action,
            String targetType,
            Long targetId,
            String description
    ) {
        record(
                AuditEvent.described(
                        actor,
                        AuditAction.valueOf(action),
                        AuditTargetType.valueOf(targetType),
                        targetId,
                        description
                )
        );
    }
}
