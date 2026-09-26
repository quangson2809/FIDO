package com.fido.modules.inventory.dto.response;

public record GoodsReceiptItemDto(
        Long receipt_item_id,
        Long variant_id,
        Integer quantity
) {
}
