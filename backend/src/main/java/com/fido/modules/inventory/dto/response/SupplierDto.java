package com.fido.modules.inventory.dto.response;

public record SupplierDto(
        Long supplier_id,
        String code,
        String name,
        String phone,
        String email,
        String status) {}
