package com.fido.modules.product.dto.request;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Internal typed value payload for Product value validation. This is not a separate write API. */
public record ProductAttributeValueInput(
        @Positive Long attribute_id,
        @Positive Long option_id,
        @Size(max = 1000) String text_value,
        BigDecimal number_value,
        Boolean boolean_value) {}
