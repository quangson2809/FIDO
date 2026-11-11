package com.fido.modules.audit.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.modules.audit.dto.response.AuditLogDto;
import com.fido.modules.audit.service.AuditQueryService;
import com.fido.modules.audit.service.AuditSearchFilter;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AuditController {
    private static final Set<String> ALLOWED_QUERY_PARAMETERS = Set.of(
            "actor_account_id", "action", "entity_type", "entity_id", "from", "to", "page", "page_size");

    private final AuditQueryService service;

    public AuditController(AuditQueryService service) {
        this.service = service;
    }

    @GetMapping
    public ApiListResponse<AuditLogDto> search(
            HttpServletRequest request,
            @RequestParam(name = "actor_account_id", required = false) Long actorAccountId,
            @RequestParam(required = false) String action,
            @RequestParam(name = "entity_type", required = false) String entityType,
            @RequestParam(name = "entity_id", required = false) String entityId,
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    OffsetDateTime from,
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    OffsetDateTime to,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        rejectUnknownParameters(request);
        return service.search(new AuditSearchFilter(
                actorAccountId, action, entityType, entityId, utc(from), utc(to), page, pageSize));
    }

    private void rejectUnknownParameters(HttpServletRequest request) {
        boolean unknown = request.getParameterMap().keySet().stream()
                .anyMatch(name -> !ALLOWED_QUERY_PARAMETERS.contains(name));
        if (unknown) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AUDIT_FILTER_UNKNOWN");
        }
    }

    private LocalDateTime utc(OffsetDateTime value) {
        return value == null ? null : value.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }
}
