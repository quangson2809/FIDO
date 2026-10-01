package com.fido.modules.order.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RecipientPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 20)
    private String recipientPhone;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 500)
    private String recipientAddress;

    private boolean phonePresent;
    private boolean addressPresent;

    public String getRecipientPhone() {
        return recipientPhone;
    }

    @JsonSetter(
            value = "recipient_phone",
            nulls = Nulls.FAIL
    )
    public void setRecipientPhone(String value) {
        recipientPhone = value;
        phonePresent = true;
    }

    public String getRecipientAddress() {
        return recipientAddress;
    }

    @JsonSetter(
            value = "recipient_address",
            nulls = Nulls.FAIL
    )
    public void setRecipientAddress(String value) {
        recipientAddress = value;
        addressPresent = true;
    }

    @JsonIgnore
    public boolean isPhonePresent() {
        return phonePresent;
    }

    @JsonIgnore
    public boolean isAddressPresent() {
        return addressPresent;
    }
}
