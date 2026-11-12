package com.fido.modules.order.dto.request;

import com.fido.modules.order.service.OrderAction;

import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrderActionRequest(
        @NotBlank @ValidOrderAction @Schema(implementation = OrderAction.class) String action,
        @Size(max = 500) String reason,
        @Size(max = 150) String carrier_name,
        @Size(max = 120) String tracking_number) {}
