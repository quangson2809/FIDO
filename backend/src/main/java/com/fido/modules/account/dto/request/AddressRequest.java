package com.fido.modules.account.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Shared create/patch input with presence tracking for partial updates. */
public class AddressRequest {
    @Pattern(regexp = ".*\\S.*") @Size(max = 150)
    private String recipient_name;
    @Pattern(regexp = ".*\\S.*") @Size(max = 20)
    private String recipient_phone;
    @Pattern(regexp = ".*\\S.*") @Size(max = 120)
    private String province;
    @Pattern(regexp = ".*\\S.*") @Size(max = 120)
    private String district;
    @Pattern(regexp = ".*\\S.*") @Size(max = 120)
    private String ward;
    @Pattern(regexp = ".*\\S.*") @Size(max = 500)
    private String address_line;
    private Boolean is_default;

    private boolean recipientNamePresent, recipientPhonePresent, provincePresent;
    private boolean districtPresent, wardPresent, addressLinePresent, defaultPresent;

    public String recipient_name() { return recipient_name; }
    public String recipient_phone() { return recipient_phone; }
    public String province() { return province; }
    public String district() { return district; }
    public String ward() { return ward; }
    public String address_line() { return address_line; }
    public Boolean is_default() { return is_default; }

    @JsonSetter(value="recipient_name", nulls=Nulls.FAIL)
    public void setRecipient_name(String value) { recipient_name=value; recipientNamePresent=true; }
    @JsonSetter(value="recipient_phone", nulls=Nulls.FAIL)
    public void setRecipient_phone(String value) { recipient_phone=value; recipientPhonePresent=true; }
    @JsonSetter(value="province", nulls=Nulls.FAIL)
    public void setProvince(String value) { province=value; provincePresent=true; }
    @JsonSetter(value="district", nulls=Nulls.FAIL)
    public void setDistrict(String value) { district=value; districtPresent=true; }
    @JsonSetter(value="ward", nulls=Nulls.FAIL)
    public void setWard(String value) { ward=value; wardPresent=true; }
    @JsonSetter(value="address_line", nulls=Nulls.FAIL)
    public void setAddress_line(String value) { address_line=value; addressLinePresent=true; }
    @JsonSetter(value="is_default", nulls=Nulls.FAIL)
    public void setIs_default(Boolean value) { is_default=value; defaultPresent=true; }

    @JsonIgnore public boolean recipientNamePresent() { return recipientNamePresent; }
    @JsonIgnore public boolean recipientPhonePresent() { return recipientPhonePresent; }
    @JsonIgnore public boolean provincePresent() { return provincePresent; }
    @JsonIgnore public boolean districtPresent() { return districtPresent; }
    @JsonIgnore public boolean wardPresent() { return wardPresent; }
    @JsonIgnore public boolean addressLinePresent() { return addressLinePresent; }
    @JsonIgnore public boolean defaultPresent() { return defaultPresent; }
    @JsonIgnore public boolean hasAnyField() {
        return recipientNamePresent || recipientPhonePresent || provincePresent || districtPresent
                || wardPresent || addressLinePresent || defaultPresent;
    }
    @JsonIgnore public boolean hasAllRequiredFields() {
        return nonblank(recipient_name) && nonblank(recipient_phone) && nonblank(province)
                && nonblank(district) && nonblank(ward) && nonblank(address_line);
    }
    private static boolean nonblank(String value) { return value != null && !value.isBlank(); }
}
