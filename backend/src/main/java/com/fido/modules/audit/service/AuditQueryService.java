package com.fido.modules.audit.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.audit.dto.response.AuditLogDto;
import com.fido.modules.audit.entity.AuditLog;
import com.fido.modules.audit.repository.AuditLogRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@Transactional
public class AuditQueryService {
    private static final Pattern ACTION_CODE = Pattern.compile("[A-Z][A-Z0-9_]{0,119}");
    private static final Pattern ENTITY_TYPE = Pattern.compile("[A-Z][A-Z0-9_]{0,79}");
    private static final Pattern ENTITY_ID = Pattern.compile("[A-Za-z0-9._:-]{1,100}");

    private final AuditLogRepository logs;
    private final AuditPayloadPolicy payloadPolicy;
    private final AuditWriteService audit;

    public AuditQueryService(
            AuditLogRepository logs,
            AuditPayloadPolicy payloadPolicy,
            AuditWriteService audit) {
        this.logs = logs;
        this.payloadPolicy = payloadPolicy;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_AUDIT_READ')")
    public ApiListResponse<AuditLogDto> search(AuditSearchFilter filter) {
        validate(filter);
        Pagination pagination = Pagination.of(filter.page(), filter.pageSize());
        var pageable = PageRequest.of(
                pagination.page() - 1,
                pagination.pageSize(),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("auditId")));
        var result = logs.findAll(AuditSpecifications.search(filter), pageable);

        List<AuditLogDto> data = result.getContent().stream().map(this::toDto).toList();

        // One metadata-only access event, appended after the read so it is not included in its own
        // result page. The audit writer never audits its own insert.
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.AUDIT_LOG_QUERY,
                AuditEntityType.AUDIT_LOG,
                "SEARCH",
                Map.of(),
                queryMetadata(filter, pagination)));

        return ApiListResponse.of(data, pagination.meta(result.getTotalElements()));
    }

    private AuditLogDto toDto(AuditLog log) {
        return new AuditLogDto(
                log.getAuditId(),
                log.getActorAccountId(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                payloadPolicy.redactForRead(log.getAction(), log.getBeforeData()),
                payloadPolicy.redactForRead(log.getAction(), log.getAfterData()),
                log.getCorrelationId(),
                log.getCreatedAt());
    }

    private Map<String, ?> queryMetadata(AuditSearchFilter filter, Pagination pagination) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        if (filter.actorAccountId() != null) metadata.put("actor_account_id", filter.actorAccountId());
        if (filter.action() != null) metadata.put("action", filter.action());
        if (filter.entityType() != null) metadata.put("entity_type", filter.entityType());
        if (filter.entityId() != null) metadata.put("entity_id", filter.entityId());
        if (filter.from() != null) metadata.put("from", filter.from().toString());
        if (filter.to() != null) metadata.put("to", filter.to().toString());
        metadata.put("page", pagination.page());
        metadata.put("page_size", pagination.pageSize());
        return metadata;
    }

    private void validate(AuditSearchFilter filter) {
        if (filter == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AUDIT_FILTER_INVALID");
        }
        if (filter.actorAccountId() != null && filter.actorAccountId() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AUDIT_FILTER_INVALID");
        }
        requireMatch(filter.action(), ACTION_CODE, "AUDIT_ACTION_FILTER_INVALID");
        requireMatch(filter.entityType(), ENTITY_TYPE, "AUDIT_ENTITY_TYPE_FILTER_INVALID");
        requireMatch(filter.entityId(), ENTITY_ID, "AUDIT_ENTITY_ID_FILTER_INVALID");
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AUDIT_TIME_RANGE_INVALID");
        }
    }

    private void requireMatch(String value, Pattern pattern, String code) {
        if (value != null && !pattern.matcher(value).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
        }
    }
}
