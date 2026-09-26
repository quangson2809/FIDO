package com.fido.modules.inventory.dto.response;

public record SupplierDto(
        Long supplier_id,
        String name,
        String phone,
        String email,
        String address,
        String usage_status,
        String note
) {
}
