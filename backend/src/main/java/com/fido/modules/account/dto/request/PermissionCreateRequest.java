package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
public record PermissionCreateRequest(@NotBlank @Size(max=120) String code, @NotBlank @Size(max=200) String name) {}
