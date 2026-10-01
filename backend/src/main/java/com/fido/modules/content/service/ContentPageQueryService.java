package com.fido.modules.content.service;

import com.fido.modules.content.dto.response.ContentPageDto;
import com.fido.modules.content.dto.response.PublicContentPageDto;
import com.fido.modules.content.mapper.ContentMapper;
import com.fido.modules.content.repository.ContentPageRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ContentPageQueryService {
    private final ContentPageRepository pages;

    public ContentPageQueryService(ContentPageRepository pages) {
        this.pages = pages;
    }

    public PublicContentPageDto publicPage(String code) {
        return ContentMapper.publicPage(pages.findByPageCode(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CONTENT_READ')")
    public List<ContentPageDto> list() {
        return pages.findAllByOrderByPageIdAsc().stream().map(ContentMapper::admin).toList();
    }
}
