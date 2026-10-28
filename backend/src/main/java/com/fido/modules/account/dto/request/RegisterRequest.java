package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Public registration accepts only the P1.2 fields; account identity/roles are never client input. */
public class RegisterRequest {

    @NotBlank
    @Size(max = 20)
    private String phone;

    @NotBlank
    @Size(max = 150)
    private String full_name;

    @Email
    @Size(max = 254)
    private String email;

    @NotBlank
    @Size(min = 8, max = 128)
    private String password;

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

    @JsonSetter("email")
    public void setEmail(String value) {
        email = value;
    }

    public String password() {
        return password;
    }

    @JsonSetter(value = "password", nulls = Nulls.FAIL)
    public void setPassword(String value) {
        password = value;
    }

    @JsonAnySetter
    public void rejectUnsupportedField(String fieldName, Object ignoredValue) {
        throw new IllegalArgumentException("Unsupported registration field");
    }
}
