package com.fido.modules.account.dto.response;

/** Target Address response shape. Null structured fields indicate a legacy row awaiting replacement. */
public record AddressDto(
        Long id,
        String recipient_name,
        String recipient_phone,
        String province,
        String district,
        String ward,
        String address_line,
        boolean is_default) {}
