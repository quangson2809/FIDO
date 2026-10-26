package com.fido.modules.inventory.repository;

/** Read-only projection for balance-to-ledger reconciliation; no persistence entity is exposed. */
public interface InventoryReconciliationView {
    Long getWarehouseId();
    Long getProductId();
    Integer getBalanceQuantity();
    Integer getBalanceVersion();
    Long getLedgerQuantity();
    Long getMovementCount();
    Boolean getQuantityMatches();
    Boolean getVersionMatches();
}
