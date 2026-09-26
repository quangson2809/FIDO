package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.*;
import java.util.List;
public class PermissionPatchRequest {
    @Pattern(regexp=".*\\S.*") @Size(max=120) private String code;
    public String code() {return code;}
    @JsonSetter(value="code",nulls=Nulls.FAIL) public void setCode(String value) {code=value;}
    @Pattern(regexp=".*\\S.*") @Size(max=200) private String name;
    public String name() {return name;}
    @JsonSetter(value="name",nulls=Nulls.FAIL) public void setName(String value) {name=value;}
}
