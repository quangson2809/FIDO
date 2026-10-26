package com.fido.modules.inventory.service;

import com.fido.modules.inventory.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/** Cross-module read contract for aggregate stock attached to Product IDs. */
@Service
@Transactional(readOnly = true)
public class InventoryAvailabilityService {
    private final InventoryRepository inventories;

    public InventoryAvailabilityService(InventoryRepository inventories) {
        this.inventories = inventories;
    }

    public int availableQuantity(Long productId) {
        return availableQuantities(java.util.List.of(productId)).getOrDefault(productId, 0);
    }

    /** Sum all warehouse balances; map iteration order must not decide a Product's availability. */
    public Map<Long, Integer> availableQuantities(Collection<Long> productIds) {
        Map<Long, Integer> result = new HashMap<>();
        if (productIds == null || productIds.isEmpty()) return result;
        inventories.findAllByProductIdIn(productIds).forEach(
                inventory -> result.merge(
                        inventory.getProductId(),
                        inventory.getQuantityOnHand() == null ? 0 : inventory.getQuantityOnHand(),
                        Math::addExact));
        return Map.copyOf(result);
    }
}
