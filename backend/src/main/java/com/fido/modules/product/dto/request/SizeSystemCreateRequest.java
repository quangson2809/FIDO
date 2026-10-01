package com.fido.modules.product.dto.request;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record SizeSystemCreateRequest(@NotBlank @Size(max=50) String code,
                                      @NotBlank @Size(max=150) String name,
                                      @Valid List<SizeValueInput> size_values) {
    public record SizeValueInput(@NotBlank @Size(max=50) String code,
                                 @NotBlank @Size(max=100) String display_name,
                                 @NotNull Integer sort_order) {}
}
