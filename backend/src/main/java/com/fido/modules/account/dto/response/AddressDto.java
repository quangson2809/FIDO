package com.fido.modules.account.dto.response;

/** Trường địa chỉ có cấu trúc bị null là dữ liệu cũ chưa được thay bằng địa chỉ đầy đủ. */
public record AddressDto(
        Long id,
        String recipient_name,
        String recipient_phone,
        String province,
        String district,
        String ward,
        String address_line,
        boolean is_default) {}
