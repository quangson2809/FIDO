package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
public record LoginRequest(@NotBlank @Size(max=20) String identifier, @NotBlank String password) {}
