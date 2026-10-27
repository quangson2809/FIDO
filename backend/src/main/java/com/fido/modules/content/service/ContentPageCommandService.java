package com.fido.modules.content.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.content.dto.request.ContentPageCreateRequest;
import com.fido.modules.content.dto.request.ContentPagePatchRequest;
import com.fido.modules.content.dto.response.ContentPageDto;
import com.fido.modules.content.entity.ContentPage;
import com.fido.modules.content.mapper.ContentMapper;
import com.fido.modules.content.repository.ContentPageRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@Transactional
public class ContentPageCommandService {
    private static final Pattern SLUG = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    private final ContentPageRepository pages;
    private final AuditWriteService audit;

    public ContentPageCommandService(ContentPageRepository pages, AuditWriteService audit) {
        this.pages = pages;
        this.audit = audit;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CONTENT_WRITE')")
    public ContentPageDto create(Long actor, ContentPageCreateRequest request) {
        requireActor(actor);
        String slug = normalizeSlug(request.slug());
        String title = normalizeTitle(request.title());
        String content = requireContent(request.content());

        if (pages.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CONTENT_SLUG_CONFLICT");
        }

        ContentPage page = new ContentPage();
        page.setSlug(slug);
        page.setTitle(title);
        page.setContent(content);
        page.setStatus("DRAFT");
        page.setUpdatedByAccountId(actor);

        try {
            pages.save(page);
            pages.flush();
        } catch (DataIntegrityViolationException ex) {
            // The unique constraint remains the final arbiter under concurrent creates.
            if (isSlugConflict(ex)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "CONTENT_SLUG_CONFLICT");
            }
            throw ex;
        }

        audit.record(AuditWriteEvent.withChanges(
                AuditAction.CONTENT_CREATE,
                AuditEntityType.CONTENT_PAGE,
                page.getPageId().toString(),
                Map.of(),
                Map.of("slug", page.getSlug(), "status", page.getStatus())));
        return ContentMapper.admin(page);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CONTENT_WRITE')")
    public ContentPageDto update(Long actor, Long id, ContentPagePatchRequest request) {
        requireActor(actor);
        if (request == null || !request.hasChanges()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CONTENT_PATCH_EMPTY");
        }

        ContentPage page = pages.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CONTENT_PAGE_NOT_FOUND"));

        String previousStatus = page.getStatus();
        String nextTitle = request.getTitle() == null ? page.getTitle() : normalizeTitle(request.getTitle());
        String nextContent = request.getContent() == null ? page.getContent() : requireContent(request.getContent());
        String nextStatus = request.getStatus() == null ? previousStatus : request.getStatus();

        requireStatusTransition(previousStatus, nextStatus);
        boolean titleChanged = !nextTitle.equals(page.getTitle());
        boolean contentChanged = !nextContent.equals(page.getContent());
        boolean statusChanged = !nextStatus.equals(previousStatus);
        if (!titleChanged && !contentChanged && !statusChanged) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CONTENT_NO_CHANGES");
        }

        page.setTitle(nextTitle);
        page.setContent(nextContent);
        page.setStatus(nextStatus);
        page.setUpdatedByAccountId(actor);
        pages.save(page);
        pages.flush();

        audit.record(AuditWriteEvent.withChanges(
                AuditAction.CONTENT_UPDATE,
                AuditEntityType.CONTENT_PAGE,
                page.getPageId().toString(),
                Map.of("slug", page.getSlug(), "status", previousStatus),
                Map.of(
                        "slug", page.getSlug(),
                        "status", page.getStatus(),
                        "title_changed", titleChanged,
                        "content_changed", contentChanged)));
        return ContentMapper.admin(page);
    }

    private boolean isSlugConflict(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof org.hibernate.exception.ConstraintViolationException violation) {
                String constraint = violation.getConstraintName();
                if (constraint != null && constraint.toLowerCase(Locale.ROOT).contains("slug")) {
                    return true;
                }
            }
            String message = cause.getMessage();
            if (message != null && message.toLowerCase(Locale.ROOT).contains("uq_content_pages_slug")) {
                return true;
            }
        }
        return false;
    }

    private String normalizeSlug(String input) {
        String slug = input == null ? "" : input.trim().toLowerCase(Locale.ROOT);
        if (slug.length() > 180 || !SLUG.matcher(slug).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CONTENT_SLUG_INVALID");
        }
        return slug;
    }

    private String normalizeTitle(String input) {
        String title = input == null ? "" : input.trim();
        if (title.isBlank() || title.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CONTENT_TITLE_INVALID");
        }
        return title;
    }

    private String requireContent(String input) {
        if (input == null || input.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CONTENT_BODY_REQUIRED");
        }
        return input;
    }

    private void requireStatusTransition(String current, String next) {
        if (current.equals(next)) {
            return;
        }
        boolean allowed = switch (current) {
            case "DRAFT" -> "PUBLISHED".equals(next) || "ARCHIVED".equals(next);
            case "PUBLISHED" -> "DRAFT".equals(next) || "ARCHIVED".equals(next);
            case "ARCHIVED" -> "DRAFT".equals(next);
            default -> false;
        };
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CONTENT_STATUS_TRANSITION_NOT_ALLOWED");
        }
    }

    private void requireActor(Long actor) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED");
        }
    }
}
