package com.fido.modules.product.dto.request;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.constraints.*;
public class ColorPatchRequest {
    @Pattern(regexp=".*\\S.*") @Size(max=50) private String code;
    @Pattern(regexp=".*\\S.*") @Size(max=100) private String name;
    public String getCode(){return code;}
    @JsonSetter(value="code",nulls=Nulls.FAIL) public void setCode(String v){code=v;}
    public String getName(){return name;}
    @JsonSetter(value="name",nulls=Nulls.FAIL) public void setName(String v){name=v;}
}
