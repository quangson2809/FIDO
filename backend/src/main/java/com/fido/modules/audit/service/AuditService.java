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
    public void record(
            Long actor,
            String action,
            String targetType,
            Long targetId
    ) {
        AuditLog log = new AuditLog();
        log.setActorAccountId(actor);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId.toString());

        logs.save(log);
    }
}
