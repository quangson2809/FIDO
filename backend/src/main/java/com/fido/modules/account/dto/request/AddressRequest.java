package com.fido.modules.account.dto.request;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.List;
public record AddressRequest(@NotBlank @Size(max=500) String address_text) {}
