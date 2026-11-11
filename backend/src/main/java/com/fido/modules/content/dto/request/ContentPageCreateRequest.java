package com.fido.modules.content.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContentPageCreateRequest(
        @NotBlank @Size(max = 180) String slug,
        @NotBlank @Size(max = 255) String title,
        @NotBlank String content) {}
