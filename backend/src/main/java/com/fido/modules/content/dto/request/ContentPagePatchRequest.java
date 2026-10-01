package com.fido.modules.content.dto.request;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
public class ContentPagePatchRequest {
    @Pattern(regexp = "(?s).*\\S.*") @Size(max = 255)
    private String title;
    @Pattern(regexp = "(?s).*\\S.*")
    private String content;
    public String getTitle() { return title; }
    public String getContent() { return content; }
    @JsonSetter(nulls = Nulls.FAIL)
    public void setTitle(String title) { this.title = title; }
    @JsonSetter(nulls = Nulls.FAIL)
    public void setContent(String content) { this.content = content; }
}
