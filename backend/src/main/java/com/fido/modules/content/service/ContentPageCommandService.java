package com.fido.modules.content.service;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.content.dto.request.ContentPageCreateRequest;
import com.fido.modules.content.dto.request.ContentPagePatchRequest;
import com.fido.modules.content.dto.response.ContentPageDto;
import com.fido.modules.content.entity.ContentPage;
import com.fido.modules.content.mapper.ContentMapper;
import com.fido.modules.content.repository.ContentPageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ContentPageCommandService {
    private final ContentPageRepository pages;
    private final AuditService audit;
    public ContentPageCommandService(ContentPageRepository pages, AuditService audit) {
        this.pages = pages;
        this.audit = audit;
    }
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CONTENT_WRITE')")
    public ContentPageDto create(Long actor, ContentPageCreateRequest request) {
        ContentPage page = new ContentPage();
        page.setPageCode(request.page_code());
        page.setTitle(request.title());
        page.setContent(request.content());
        page.setUpdatedByAccountId(actor);
        pages.save(page);
        pages.flush();
        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.CONTENT_CREATE,
                        AuditTargetType.CONTENT_PAGE,
                        page.getPageId()
                )
        );
        return ContentMapper.admin(page);
    }
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CONTENT_WRITE')")
    public ContentPageDto update(Long actor, Long id, ContentPagePatchRequest request) {
        ContentPage page = pages.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (request.getTitle() != null) page.setTitle(request.getTitle());
        if (request.getContent() != null) page.setContent(request.getContent());
        page.setUpdatedByAccountId(actor);
        pages.flush();
        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.CONTENT_UPDATE,
                        AuditTargetType.CONTENT_PAGE,
                        id
                )
        );
        return ContentMapper.admin(page);
    }
}
