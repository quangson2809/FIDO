package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Permission codes are stable identifiers and are intentionally not patchable. */
public class PermissionPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 200)
    private String name;

    public String name() {
        return name;
    }

    @JsonSetter(value = "name", nulls = Nulls.FAIL)
    public void setName(String value) {
        name = value;
    }
}
