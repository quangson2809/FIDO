package com.fido.modules.order.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AdminOrderPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 20)
    private String recipientPhone;

    @Email
    @Size(max = 254)
    private String recipientEmail;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 500)
    private String recipientAddress;

    private String customerServiceNote;

    @Valid
    private ShippingInfoInput shippingInfo;

    private boolean phonePresent;
    private boolean emailPresent;
    private boolean addressPresent;
    private boolean notePresent;
    private boolean shippingInfoPresent;

    public String getRecipientPhone() { return recipientPhone; }

    @JsonSetter(value = "recipient_phone", nulls = Nulls.FAIL)
    public void setRecipientPhone(String value) {
        recipientPhone = value;
        phonePresent = true;
    }

    public String getRecipientEmail() { return recipientEmail; }

    @JsonSetter("recipient_email")
    public void setRecipientEmail(String value) {
        recipientEmail = value;
        emailPresent = true;
    }

    public String getRecipientAddress() { return recipientAddress; }

    @JsonSetter(value = "recipient_address", nulls = Nulls.FAIL)
    public void setRecipientAddress(String value) {
        recipientAddress = value;
        addressPresent = true;
    }

    public String getCustomerServiceNote() { return customerServiceNote; }

    @JsonSetter("customer_service_note")
    public void setCustomerServiceNote(String value) {
        customerServiceNote = value;
        notePresent = true;
    }

    public ShippingInfoInput getShippingInfo() { return shippingInfo; }

    @JsonSetter(value = "shipping_info", nulls = Nulls.FAIL)
    public void setShippingInfo(ShippingInfoInput value) {
        shippingInfo = value;
        shippingInfoPresent = true;
    }

    @JsonIgnore public boolean isPhonePresent() { return phonePresent; }
    @JsonIgnore public boolean isEmailPresent() { return emailPresent; }
    @JsonIgnore public boolean isAddressPresent() { return addressPresent; }
    @JsonIgnore public boolean isNotePresent() { return notePresent; }
    @JsonIgnore public boolean isShippingInfoPresent() { return shippingInfoPresent; }

    public record ShippingInfoInput(
            @NotBlank @Size(max = 30) String delivery_mode,
            @Size(max = 255) String carrier_name
    ) {
    }
}
