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

    @Email
    @Size(max = 254)
    private String email;

    private List<@NotNull Long> role_ids;

    public String phone() {
        return phone;
    }

    @JsonSetter(
            value = "phone",
            nulls = Nulls.FAIL
    )
    public void setPhone(String value) {
        phone = value;
    }

    public String email() {
        return email;
    }

    @JsonSetter(
            value = "email",
            nulls = Nulls.FAIL
    )
    public void setEmail(String value) {
        email = value;
    }

    public List<@NotNull Long> role_ids() {
        return role_ids;
    }

    @JsonSetter(
            value = "role_ids",
            nulls = Nulls.FAIL
    )
    public void setRole_ids(List<@NotNull Long> value) {
        role_ids = value;
    }
}
