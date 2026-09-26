package com.fido.modules.inventory.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
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

    @Size(max = 500)
    private String address;

    @Pattern(regexp = "ACTIVE|INACTIVE")
    private String usageStatus;

    @Size(max = 500)
    private String note;

    private boolean phonePresent;
    private boolean emailPresent;
    private boolean addressPresent;
    private boolean notePresent;

    public String getName() {
        return name;
    }

    @JsonSetter(value = "name", nulls = Nulls.FAIL)
    public void setName(String value) {
        name = value;
    }

    public String getPhone() {
        return phone;
    }

    @JsonSetter("phone")
    public void setPhone(String value) {
        phone = value;
        phonePresent = true;
    }

    public String getEmail() {
        return email;
    }

    @JsonSetter("email")
    public void setEmail(String value) {
        email = value;
        emailPresent = true;
    }

    public String getAddress() {
        return address;
    }

    @JsonSetter("address")
    public void setAddress(String value) {
        address = value;
        addressPresent = true;
    }

    public String getUsageStatus() {
        return usageStatus;
    }

    @JsonSetter(value = "usage_status", nulls = Nulls.FAIL)
    public void setUsageStatus(String value) {
        usageStatus = value;
    }

    public String getNote() {
        return note;
    }

    @JsonSetter("note")
    public void setNote(String value) {
        note = value;
        notePresent = true;
    }

    @JsonIgnore
    public boolean isPhonePresent() {
        return phonePresent;
    }

    @JsonIgnore
    public boolean isEmailPresent() {
        return emailPresent;
    }

    @JsonIgnore
    public boolean isAddressPresent() {
        return addressPresent;
    }

    @JsonIgnore
    public boolean isNotePresent() {
        return notePresent;
    }
}
