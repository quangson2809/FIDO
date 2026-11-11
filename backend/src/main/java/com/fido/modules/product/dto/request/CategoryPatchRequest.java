package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class CategoryPatchRequest {

    @Positive private Long parentCategoryId;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String name;

    @Pattern(regexp = "ACTIVE|INACTIVE")
    private String status;

    private boolean parentPresent;
    private boolean namePresent;
    private boolean statusPresent;

    public Long getParentCategoryId() {
        return parentCategoryId;
    }

    @JsonSetter(value = "parent_category_id", nulls = Nulls.SET)
    public void setParentCategoryId(Long value) {
        parentCategoryId = value;
        parentPresent = true;
    }

    public String getName() {
        return name;
    }

    @JsonSetter(value = "name", nulls = Nulls.FAIL)
    public void setName(String value) {
        name = value;
        namePresent = true;
    }

    public String getStatus() {
        return status;
    }

    @JsonSetter(value = "status", nulls = Nulls.FAIL)
    public void setStatus(String value) {
        status = value;
        statusPresent = true;
    }

    @JsonIgnore
    public boolean isParentPresent() {
        return parentPresent;
    }

    @JsonIgnore
    public boolean isNamePresent() {
        return namePresent;
    }

    @JsonIgnore
    public boolean isStatusPresent() {
        return statusPresent;
    }

    @JsonIgnore
    public boolean hasChanges() {
        return parentPresent || namePresent || statusPresent;
    }
}
