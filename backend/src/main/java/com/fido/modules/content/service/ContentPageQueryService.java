package com.fido.modules.content.service;

import com.fido.modules.content.dto.response.ContentPageSummaryDto;
import com.fido.modules.content.dto.response.PublicContentPageDto;
import com.fido.modules.content.mapper.ContentMapper;
import com.fido.modules.content.repository.ContentPageRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class ContentPageQueryService {
    private static final Pattern SLUG = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");

    private final ContentPageRepository pages;

    public ContentPageQueryService(ContentPageRepository pages) {
        this.pages = pages;
    }

    public PublicContentPageDto publicPage(String requestedSlug) {
        String slug = normalizePublicSlug(requestedSlug);
        return ContentMapper.publicPage(
                pages.findBySlugAndStatus(slug, "PUBLISHED")
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CONTENT_PAGE_NOT_FOUND")));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CONTENT_READ')")
    public List<ContentPageSummaryDto> list() {
        // API-73's current response contract is {data:[...]}; keep its envelope and expose summaries only.
        return pages.findAllByOrderByPageIdAsc().stream().map(ContentMapper::summary).toList();
    }

    private String normalizePublicSlug(String input) {
        String slug = input == null ? "" : input.trim().toLowerCase(Locale.ROOT);
        if (slug.length() > 180 || !SLUG.matcher(slug).matches()) {
            // Invalid, missing, DRAFT and ARCHIVED pages are intentionally indistinguishable publicly.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CONTENT_PAGE_NOT_FOUND");
        }
        return slug;
    }
}
