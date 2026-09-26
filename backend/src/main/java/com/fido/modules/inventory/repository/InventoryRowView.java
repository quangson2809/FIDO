package com.fido.modules.inventory.repository;

import java.time.LocalDateTime;

public interface InventoryRowView {

    Long getVariantId();

    String getSku();

    Long getProductId();

    String getProductName();

    String getSize();

    String getColor();

    String getSaleStatus();

    Integer getAvailableQuantity();

    LocalDateTime getUpdatedAt();
}
