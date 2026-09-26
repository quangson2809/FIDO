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
 * Phase 4 also owns initialization of the one-row-per-variant invariant.
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

    @Transactional
    public void initializeVariant(Long variantId) {
        if (inventories.findById(variantId).isPresent()) {
            return;
        }

        Inventory inventory = new Inventory();
        inventory.setVariantId(variantId);
        inventory.setAvailableQuantity(0);

        inventories.save(inventory);
    }
}
