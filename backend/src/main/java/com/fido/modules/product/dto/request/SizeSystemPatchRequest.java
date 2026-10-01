package com.fido.modules.product.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public class SizeSystemPatchRequest {

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 50)
    private String code;

    @Pattern(regexp = ".*\\S.*")
    @Size(max = 150)
    private String name;

    @Valid
    private List<SizeValueInput> sizeValues;

    private boolean sizeValuesPresent;

    public String getCode() {
        return code;
    }

    @JsonSetter(
            value = "code",
            nulls = Nulls.FAIL
    )
    public void setCode(String value) {
        code = value;
    }

    public String getName() {
        return name;
    }

    @JsonSetter(
            value = "name",
            nulls = Nulls.FAIL
    )
    public void setName(String value) {
        name = value;
    }

    public List<SizeValueInput> getSizeValues() {
        return sizeValues;
    }

    @JsonSetter(
            value = "size_values",
            nulls = Nulls.FAIL
    )
    public void setSizeValues(List<SizeValueInput> value) {
        sizeValues = value;
        sizeValuesPresent = true;
    }

    @JsonIgnore
    public boolean isSizeValuesPresent() {
        return sizeValuesPresent;
    }

    public record SizeValueInput(
            @Positive Long size_value_id,
            @NotBlank @Size(max = 50) String code,
            @NotBlank @Size(max = 100) String display_name,
            @NotNull Integer sort_order
    ) {
    }
}
