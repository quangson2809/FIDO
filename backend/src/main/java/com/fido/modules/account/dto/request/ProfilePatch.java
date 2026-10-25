package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** P1.2 permits only full_name/email profile patches; phone changes have no approved workflow. */
public class ProfilePatch {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String full_name;

    @Email
    @Size(max = 254)
    private String email;

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

    @JsonAnySetter
    public void rejectUnsupportedField(String fieldName, Object ignoredValue) {
        throw new IllegalArgumentException("Unsupported profile field");
    }
}
