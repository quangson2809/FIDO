package com.fido.modules.product.dto.response;

import java.math.BigDecimal;

public record ProductAttributeValueDto(
        Long attribute_id,
        String attribute_code,
        String attribute_name,
        String data_type,
        Long option_id,
        String option_value,
        String option_label,
        String text_value,
        BigDecimal number_value,
        Boolean boolean_value) {}
