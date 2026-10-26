package com.fido.modules.inventory.repository;

import java.time.LocalDateTime;

public interface InventoryRowView {
    Long getWarehouseId();
    Long getProductId();
    String getSku();
    String getProductName();
    Integer getAvailableQuantity();
    LocalDateTime getUpdatedAt();
}
