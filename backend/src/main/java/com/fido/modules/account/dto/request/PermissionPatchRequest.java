package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Mã quyền không được đổi; mô tả có thể bị xóa bằng giá trị null được gửi rõ ràng. */
public class PermissionPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 200)
    private String name;

    @Size(max = 500)
    private String description;

    private boolean descriptionPresent;

    public String name() {
        return name;
    }

    @JsonSetter(value = "name", nulls = Nulls.FAIL)
    public void setName(String value) {
        name = value;
    }

    public String description() {
        return description;
    }

    @JsonSetter
    public void setDescription(String value) {
        description = value;
        descriptionPresent = true;
    }

    @JsonIgnore
    public boolean descriptionPresent() {
        return descriptionPresent;
    }
}
