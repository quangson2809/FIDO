package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
public record StaffCreateRequest(@NotBlank @Size(max=20) String phone, @Email @Size(max=254) String email, @NotBlank String password, List<@NotNull Long> role_ids) {}
