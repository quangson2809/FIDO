package com.fido.modules.product.dto.request;
import com.fasterxml.jackson.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public class SizeSystemPatchRequest {
    @Pattern(regexp=".*\\S.*") @Size(max=50) private String code;
    @Pattern(regexp=".*\\S.*") @Size(max=150) private String name;
    @Valid private List<SizeValueInput> sizeValues;
    private boolean sizeValuesPresent;
    public String getCode(){return code;}
    @JsonSetter(value="code",nulls=Nulls.FAIL) public void setCode(String v){code=v;}
    public String getName(){return name;}
    @JsonSetter(value="name",nulls=Nulls.FAIL) public void setName(String v){name=v;}
    public List<SizeValueInput> getSizeValues(){return sizeValues;}
    @JsonSetter(value="size_values",nulls=Nulls.FAIL) public void setSizeValues(List<SizeValueInput> v){sizeValues=v;sizeValuesPresent=true;}
    @JsonIgnore public boolean isSizeValuesPresent(){return sizeValuesPresent;}
    public record SizeValueInput(@Positive Long size_value_id,
                                 @NotBlank @Size(max=50) String code,
                                 @NotBlank @Size(max=100) String display_name,
                                 @NotNull Integer sort_order) {}
}
