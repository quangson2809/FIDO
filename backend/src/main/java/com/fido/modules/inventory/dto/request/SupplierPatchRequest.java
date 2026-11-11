package com.fido.modules.inventory.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class SupplierPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 255)
    private String name;

    @Size(max = 20)
    private String phone;

    @Email
    @Size(max = 254)
    private String email;

    @Pattern(regexp = "ACTIVE|INACTIVE")
    private String status;

    private boolean phonePresent;
    private boolean emailPresent;

    public String getName() { return name; }

    @JsonSetter(value = "name", nulls = com.fasterxml.jackson.annotation.Nulls.FAIL)
    public void setName(String value) { name = value; }

    public String getPhone() { return phone; }

    @JsonSetter("phone")
    public void setPhone(String value) { phone = value; phonePresent = true; }

    public String getEmail() { return email; }

    @JsonSetter("email")
    public void setEmail(String value) { email = value; emailPresent = true; }

    public String getStatus() { return status; }

    @JsonSetter(value = "status", nulls = com.fasterxml.jackson.annotation.Nulls.FAIL)
    public void setStatus(String value) { status = value; }

    @JsonIgnore
    public boolean isPhonePresent() { return phonePresent; }

    @JsonIgnore
    public boolean isEmailPresent() { return emailPresent; }
}
