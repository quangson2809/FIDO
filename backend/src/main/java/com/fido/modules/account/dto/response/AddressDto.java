package com.fido.modules.account.dto.response;
import java.time.LocalDateTime;
public record AddressDto(Long address_id, String address_text, LocalDateTime created_at) {}
