package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public class StaffPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 20)
    private String phone;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String full_name;

    @Email
    @Size(max = 254)
    private String email;

    @Pattern(regexp = "ACTIVE|PENDING_APPROVAL|LOCKED|SUSPENDED")
    private String status;

    private List<@NotNull Long> role_ids;

    public String phone() {
        return phone;
    }

    @JsonSetter(value = "phone", nulls = Nulls.FAIL)
    public void setPhone(String value) {
        phone = value;
    }

    public String full_name() {
        return full_name;
    }

    @JsonSetter(value = "full_name", nulls = Nulls.FAIL)
    public void setFull_name(String value) {
        full_name = value;
    }

    public String email() {
        return email;
    }

    @JsonSetter(value = "email", nulls = Nulls.FAIL)
    public void setEmail(String value) {
        email = value;
    }

    public String status() {
        return status;
    }

    @JsonSetter(value = "status", nulls = Nulls.FAIL)
    public void setStatus(String value) {
        status = value;
    }

    public List<Long> role_ids() {
        return role_ids;
    }

    @JsonSetter(value = "role_ids", nulls = Nulls.FAIL)
    public void setRole_ids(List<@NotNull Long> value) {
        role_ids = value;
    }
}
