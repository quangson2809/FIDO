package com.fido.modules.audit.service;
import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.audit.dto.response.AuditLogDto;
import com.fido.modules.audit.entity.AuditLog;
import com.fido.modules.audit.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class AuditQueryService {
    private final AuditLogRepository logs;
    public AuditQueryService(AuditLogRepository logs) { this.logs = logs; }
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_AUDIT_READ')")
    public ApiListResponse<AuditLogDto> search(Long actor, String action, String targetType,
            String targetId, LocalDateTime from, LocalDateTime to, Integer page, Integer pageSize) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        Pagination pagination = Pagination.of(page, pageSize);
        Specification<AuditLog> spec = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (actor != null) predicates.add(cb.equal(root.get("actorAccountId"), actor));
            if (action != null) predicates.add(cb.equal(root.get("action"), action));
            if (targetType != null) predicates.add(cb.equal(root.get("targetType"), targetType));
            if (targetId != null) predicates.add(cb.equal(root.get("targetId"), targetId));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        var result = logs.findAll(spec, org.springframework.data.domain.PageRequest.of(
                pagination.page() - 1, pagination.pageSize(), Sort.by("auditId").descending()));
        return ApiListResponse.of(result.getContent().stream().map(log -> new AuditLogDto(
                log.getAuditId(), log.getActorAccountId(), log.getAction(), log.getTargetType(),
                log.getTargetId(), log.getDescription(), log.getCreatedAt())).toList(),
                pagination.meta(result.getTotalElements()));
    }
}
