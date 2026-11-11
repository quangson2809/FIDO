package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class BrandPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String name;

    @Pattern(regexp = "ACTIVE|INACTIVE")
    private String status;

    private boolean namePresent;
    private boolean statusPresent;

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
    public boolean isNamePresent() {
        return namePresent;
    }

    @JsonIgnore
    public boolean isStatusPresent() {
        return statusPresent;
    }

    @JsonIgnore
    public boolean hasChanges() {
        return namePresent || statusPresent;
    }
}
