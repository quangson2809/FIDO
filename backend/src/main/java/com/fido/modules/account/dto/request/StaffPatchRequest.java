package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.*;
import java.util.List;
public class StaffPatchRequest {
    @Pattern(regexp=".*\\S.*") @Size(max=20) private String phone;
    public String phone() {return phone;}
    @JsonSetter(value="phone",nulls=Nulls.FAIL) public void setPhone(String value) {phone=value;}
    @Email @Size(max=254) private String email;
    public String email() {return email;}
    @JsonSetter(value="email",nulls=Nulls.FAIL) public void setEmail(String value) {email=value;}
    private List<@NotNull Long> role_ids;
    public List<@NotNull Long> role_ids() {return role_ids;}
    @JsonSetter(value="role_ids",nulls=Nulls.FAIL) public void setRole_ids(List<@NotNull Long> value) {role_ids=value;}
}
