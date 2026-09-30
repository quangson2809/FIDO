package com.fido.modules.audit.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.audit.dto.response.AuditLogDto;
import com.fido.modules.audit.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class AuditQueryService {

    private final AuditLogRepository logs;

    public AuditQueryService(
            AuditLogRepository logs
    ) {
        this.logs = logs;
    }

    @PreAuthorize(
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_AUDIT_READ')"
    )
    public ApiListResponse<AuditLogDto> search(
            AuditSearchFilter filter
    ) {
        validateRange(filter);

        Pagination pagination = Pagination.of(
                filter.page(),
                filter.pageSize()
        );

        var pageable = PageRequest.of(
                pagination.page() - 1,
                pagination.pageSize(),
                Sort.by("auditId").descending()
        );

        var result = logs.findAll(
                AuditSpecifications.search(filter),
                pageable
        );

        var data = result.getContent()
                .stream()
                .map(log ->
                        new AuditLogDto(
                                log.getAuditId(),
                                log.getActorAccountId(),
                                log.getAction(),
                                log.getTargetType(),
                                log.getTargetId(),
                                log.getDescription(),
                                log.getCreatedAt()
                        )
                )
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    private void validateRange(
            AuditSearchFilter filter
    ) {
        if (filter.from() != null
                && filter.to() != null
                && filter.from().isAfter(filter.to())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }
}
