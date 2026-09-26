package com.fido.modules.product.dto.response;
import java.util.List;
public record SizeSystemDto(Long size_system_id, String code, String name, List<SizeValueDto> size_values) {}
