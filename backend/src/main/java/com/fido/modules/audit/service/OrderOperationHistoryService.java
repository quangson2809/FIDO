package com.fido.modules.audit.service;

import com.fido.modules.audit.repository.AuditLogRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class OrderOperationHistoryService {
    private final AuditLogRepository logs;
    private final AuditPayloadPolicy policy;

    public OrderOperationHistoryService(AuditLogRepository logs, AuditPayloadPolicy policy) {
        this.logs = logs;
        this.policy = policy;
    }

    public record Entry(
            long id,
            Long actor_account_id,
            String action,
            LocalDateTime created_at,
            Map<String, Object> before,
            Map<String, Object> after) {}

    // Caller is the Order-owning service, which enforces ORDER_READ and resource existence.
    public List<Entry> forOrder(long orderId) {
        return logs
                .findAll(
                        (root, query, cb) ->
                                cb.and(
                                        cb.equal(root.get("entityType"), "ORDER"),
                                        cb.equal(root.get("entityId"), Long.toString(orderId))),
                        org.springframework.data.domain.PageRequest.of(
                                0,
                                200,
                                org.springframework.data.domain.Sort.by("auditId").descending()))
                .stream()
                .map(
                        row ->
                                new Entry(
                                        row.getAuditId(),
                                        row.getActorAccountId(),
                                        row.getAction(),
                                        row.getCreatedAt(),
                                        policy.redactForRead(row.getAction(), row.getBeforeData()),
                                        policy.redactForRead(row.getAction(), row.getAfterData())))
                .toList();
    }
}
