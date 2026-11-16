package com.fido.modules.inventory.repository.projection;

/** Kết quả đọc đối chiếu số dư với ledger; không đưa entity lưu trữ ra ngoài. */
public interface InventoryReconciliationView {
    Long getWarehouseId();

    Long getProductId();

    Integer getBalanceQuantity();

    Integer getBalanceVersion();

    Long getLedgerQuantity();

    Long getMovementCount();

    Number getQuantityMatches();

    Number getVersionMatches();
}
