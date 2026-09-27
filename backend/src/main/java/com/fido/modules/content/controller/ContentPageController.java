package com.fido.modules.content.controller;
import com.fido.common.response.ApiResponse;
import com.fido.modules.content.dto.request.ContentPageCreateRequest;
import com.fido.modules.content.dto.request.ContentPagePatchRequest;
import com.fido.modules.content.dto.response.ContentPageDto;
import com.fido.modules.content.dto.response.PublicContentPageDto;
import com.fido.modules.content.service.ContentPageService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ContentPageController {
    private final ContentPageService service;
    public ContentPageController(ContentPageService service) { this.service = service; }
    @GetMapping("/content-pages/{pageCode}")
    public ApiResponse<PublicContentPageDto> publicPage(@PathVariable String pageCode) {
        return ApiResponse.of(service.publicPage(pageCode));
    }
    @GetMapping("/admin/content-pages")
    public ApiResponse<List<ContentPageDto>> list() { return ApiResponse.of(service.list()); }
    @PostMapping("/admin/content-pages")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ContentPageDto> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ContentPageCreateRequest request) {
        return ApiResponse.of(service.create(Long.valueOf(jwt.getSubject()), request));
    }
    @PatchMapping("/admin/content-pages/{pageId}")
    public ApiResponse<ContentPageDto> update(@AuthenticationPrincipal Jwt jwt,
            @PathVariable Long pageId, @Valid @RequestBody ContentPagePatchRequest request) {
        return ApiResponse.of(service.update(Long.valueOf(jwt.getSubject()), pageId, request));
    }
}
