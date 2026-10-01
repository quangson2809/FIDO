package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class CategoryPatchRequest {

    @Positive
    private Long parentCategoryId;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String name;

    private boolean parentPresent;

    public Long getParentCategoryId() {
        return parentCategoryId;
    }

    @JsonSetter("parent_category_id")
    public void setParentCategoryId(Long value) {
        parentCategoryId = value;
        parentPresent = true;
    }

    public String getName() {
        return name;
    }

    @JsonSetter(
            value = "name",
            nulls = Nulls.FAIL
    )
    public void setName(String value) {
        name = value;
    }

    @JsonIgnore
    public boolean isParentPresent() {
        return parentPresent;
    }
}
