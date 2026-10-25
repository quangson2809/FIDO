package com.fido.modules.audit.service;

import com.fido.config.web.CorrelationIdContext;
import com.fido.modules.audit.repository.AuditWriteRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * Synchronous write contract for domain application services.
 *
 * <p>MANDATORY prevents a caller from accidentally committing an audit row independently of the
 * protected mutation. Exceptions are intentionally not swallowed so the caller's transaction
 * rolls back when the audit insert cannot be committed.
 */
@Service
public class AuditWriteService {

    private final AuditWriteRepository repository;
    private final AuditActorResolver actorResolver;
    private final AuditPayloadPolicy payloadPolicy;

    public AuditWriteService(
            AuditWriteRepository repository,
            AuditActorResolver actorResolver,
            AuditPayloadPolicy payloadPolicy) {
        this.repository = repository;
        this.actorResolver = actorResolver;
        this.payloadPolicy = payloadPolicy;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(AuditWriteEvent event) {
        write(event, actorResolver.requireAuthenticatedAccountId());
    }

    /**
     * For trusted autonomous/system commands only. Human-request paths must call record(event).
     * The explicit method name keeps nullable actor attribution out of normal domain calls.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordSystemEvent(AuditWriteEvent event) {
        write(event, null);
    }

    private void write(AuditWriteEvent event, Long actorAccountId) {
        Objects.requireNonNull(event, "event");
        String beforeJson = payloadPolicy.toJson(event.action(), event.beforeData());
        String afterJson = payloadPolicy.toJson(event.action(), event.afterData());

        repository.insert(
                actorAccountId,
                event.action().name(),
                event.entityType().name(),
                event.entityId(),
                beforeJson,
                afterJson,
                CorrelationIdContext.currentOrGenerate());
    }
}
