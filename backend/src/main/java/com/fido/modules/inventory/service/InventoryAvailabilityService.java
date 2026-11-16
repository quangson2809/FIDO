package com.fido.modules.inventory.service;

import com.fido.modules.inventory.repository.InventoryRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/** Hợp đồng đọc tồn kho theo Product ID cho các module khác. */
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

    /** Chưa có dòng tồn kho thì đọc như số lượng/version bằng 0; không tạo dòng mới. */
    public BalanceSnapshot balance(Long productId) {
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        return inventories
                .findByWarehouseIdAndProductId(warehouseId, productId)
                .map(
                        inventory ->
                                new BalanceSnapshot(
                                        inventory.getQuantityOnHand() == null
                                                ? 0
                                                : inventory.getQuantityOnHand(),
                                        inventory.getVersion() == null
                                                ? 0
                                                : inventory.getVersion()))
                .orElseGet(() -> new BalanceSnapshot(0, 0));
    }

    /** Chỉ trả tồn của kho vận hành do máy chủ chọn, không cộng gộp các kho. */
    public Map<Long, Integer> availableQuantities(Collection<Long> productIds) {
        Map<Long, Integer> result = new HashMap<>();
        if (productIds == null || productIds.isEmpty()) return Map.of();
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        inventories
                .findAllByWarehouseIdAndProductIdIn(warehouseId, productIds)
                .forEach(
                        inventory ->
                                result.put(
                                        inventory.getProductId(),
                                        inventory.getQuantityOnHand() == null
                                                ? 0
                                                : inventory.getQuantityOnHand()));
        return Map.copyOf(result);
    }

    public record BalanceSnapshot(int quantityOnHand, int version) {}
}
