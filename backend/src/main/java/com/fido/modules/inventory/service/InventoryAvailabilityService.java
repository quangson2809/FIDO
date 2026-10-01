package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.repository.InventoryRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cross-module contract for current sellable availability.
 */
@Service
@Transactional(readOnly = true)
public class InventoryAvailabilityService {

    private final InventoryRepository inventories;

    public InventoryAvailabilityService(
            InventoryRepository inventories
    ) {
        this.inventories = inventories;
    }

    public int availableQuantity(Long variantId) {
        return inventories.findById(variantId)
                .map(Inventory::getAvailableQuantity)
                .orElse(0);
    }

    public Map<Long, Integer> availableQuantities(
            Collection<Long> variantIds
    ) {
        var result = new HashMap<Long, Integer>();

        if (variantIds == null || variantIds.isEmpty()) {
            return result;
        }

        inventories.findAllByVariantIdIn(variantIds)
                .forEach(inventory ->
                        result.put(
                                inventory.getVariantId(),
                                inventory.getAvailableQuantity()
                        )
                );

        return result;
    }
}
