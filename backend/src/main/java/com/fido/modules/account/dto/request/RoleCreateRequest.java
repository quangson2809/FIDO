package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
public record RoleCreateRequest(@NotBlank @Size(max=80) String code, @NotBlank @Size(max=150) String name, @Size(max=500) String description, List<@NotNull Long> permission_ids) {}
