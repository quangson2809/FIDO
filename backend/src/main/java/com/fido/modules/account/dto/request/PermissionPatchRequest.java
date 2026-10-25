package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Permission code is an immutable technical identifier. Description can explicitly be cleared. */
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
