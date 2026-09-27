package com.fido.modules.audit.controller;
import com.fido.common.response.ApiListResponse;
import com.fido.modules.audit.dto.response.AuditLogDto;
import com.fido.modules.audit.service.AuditQueryService;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AuditController {
    private final AuditQueryService service;
    public AuditController(AuditQueryService service) { this.service = service; }
    @GetMapping
    public ApiListResponse<AuditLogDto> search(
            @RequestParam(name = "actor_account_id", required = false) Long actor,
            @RequestParam(required = false) String action,
            @RequestParam(name = "target_type", required = false) String targetType,
            @RequestParam(name = "target_id", required = false) String targetId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        return service.search(actor, action, targetType, targetId, from, to, page, pageSize);
    }
}
