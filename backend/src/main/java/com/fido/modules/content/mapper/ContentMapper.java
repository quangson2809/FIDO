package com.fido.modules.content.mapper;
import com.fido.modules.content.dto.response.ContentPageDto;
import com.fido.modules.content.dto.response.PublicContentPageDto;
import com.fido.modules.content.entity.ContentPage;
public final class ContentMapper {
    private ContentMapper() {}
    public static ContentPageDto admin(ContentPage page) {
        return new ContentPageDto(page.getPageId(), page.getPageCode(), page.getTitle(),
                page.getContent(), page.getUpdatedByAccountId(), page.getUpdatedAt());
    }
    public static PublicContentPageDto publicPage(ContentPage page) {
        return new PublicContentPageDto(page.getPageCode(), page.getTitle(), page.getContent(), page.getUpdatedAt());
    }
}
