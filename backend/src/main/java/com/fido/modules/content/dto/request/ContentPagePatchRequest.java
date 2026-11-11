package com.fido.modules.content.dto.request;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ContentPagePatchRequest {
    @Pattern(regexp = "(?s).*\\S.*")
    @Size(max = 255)
    private String title;

    @Pattern(regexp = "(?s).*\\S.*")
    private String content;

    @Pattern(regexp = "DRAFT|PUBLISHED|ARCHIVED")
    private String status;

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public String getStatus() {
        return status;
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setTitle(String title) {
        this.title = title;
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setContent(String content) {
        this.content = content;
    }

    @JsonSetter(nulls = Nulls.FAIL)
    public void setStatus(String status) {
        this.status = status;
    }

    public boolean hasChanges() {
        return title != null || content != null || status != null;
    }
}
