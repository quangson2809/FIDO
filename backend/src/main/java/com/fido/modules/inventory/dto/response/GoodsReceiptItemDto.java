package com.fido.modules.inventory.dto.response;

public record GoodsReceiptItemDto(
        Long receipt_item_id, Long product_id, Integer quantity_received, Long unit_cost) {}
