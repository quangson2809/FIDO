package com.fido.modules.inventory.service;

import com.fido.modules.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/** Cross-module read contract for stock availability by canonical Product ID. */
@Service
@Transactional(readOnly = true)
public class InventoryAvailabilityService {
    private final InventoryRepository inventories;
    private final OperationalWarehouseService operationalWarehouse;

    public InventoryAvailabilityService(
            InventoryRepository inventories, OperationalWarehouseService operationalWarehouse) {
        this.inventories = inventories;
        this.operationalWarehouse = operationalWarehouse;
    }

    public int availableQuantity(Long productId) {
        return balance(productId).quantityOnHand();
    }

    /** Returns logical zeroes for a missing composite balance row without creating it. */
    public BalanceSnapshot balance(Long productId) {
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        return inventories.findByWarehouseIdAndProductId(warehouseId, productId)
                .map(inventory -> new BalanceSnapshot(
                        inventory.getQuantityOnHand() == null ? 0 : inventory.getQuantityOnHand(),
                        inventory.getVersion() == null ? 0 : inventory.getVersion()))
                .orElseGet(() -> new BalanceSnapshot(0, 0));
    }

    /** Availability is the resolved operational warehouse's balance, never a sum of warehouses. */
    public Map<Long, Integer> availableQuantities(Collection<Long> productIds) {
        Map<Long, Integer> result = new HashMap<>();
        if (productIds == null || productIds.isEmpty()) return Map.of();
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        inventories.findAllByWarehouseIdAndProductIdIn(warehouseId, productIds).forEach(
                inventory -> result.put(
                        inventory.getProductId(),
                        inventory.getQuantityOnHand() == null ? 0 : inventory.getQuantityOnHand()));
        return Map.copyOf(result);
    }

    public record BalanceSnapshot(int quantityOnHand, int version) {}
}
