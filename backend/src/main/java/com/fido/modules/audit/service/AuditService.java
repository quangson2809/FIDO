package com.fido.modules.audit.service;

import com.fido.config.web.CorrelationIdContext;
import com.fido.modules.audit.entity.AuditLog;
import com.fido.modules.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
    private final AuditLogRepository logs;
    public AuditService(AuditLogRepository logs) { this.logs = logs; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(AuditEvent event) {
        AuditLog log = new AuditLog();
        log.setActorAccountId(event.actorAccountId());
        log.setAction(event.action().name());
        log.setEntityType(event.targetType().name());
        log.setEntityId(event.targetId().toString());
        log.setCorrelationId(CorrelationIdContext.currentOrGenerate());
        logs.save(log);
    }
}
