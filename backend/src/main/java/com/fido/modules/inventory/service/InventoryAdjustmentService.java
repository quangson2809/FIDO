package com.fido.modules.inventory.service;

import com.fido.modules.inventory.dto.request.InventoryAdjustmentRequest;
import com.fido.modules.inventory.dto.request.InventoryReversalRequest;
import com.fido.modules.inventory.dto.response.InventoryTransactionDto;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.mapper.InventoryMapper;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryAdjustmentService {
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";
    private final InventoryCommandService inventoryCommands;

    public InventoryAdjustmentService(InventoryCommandService inventoryCommands) {
        this.inventoryCommands = inventoryCommands;
    }

    @PreAuthorize(WRITE)
    public InventoryTransactionDto adjust(Long actor, InventoryAdjustmentRequest request) {
        InventoryTransaction transaction = inventoryCommands.adjustManually(
                actor,
                request.product_id(),
                request.quantity_delta(),
                request.reason_code(),
                request.source_operation_id(),
                request.expected_version());
        return InventoryMapper.transaction(transaction);
    }

    @PreAuthorize(WRITE)
    public InventoryTransactionDto reverse(
            Long actor, Long sourceTransactionId, InventoryReversalRequest request) {
        InventoryTransaction transaction = inventoryCommands.reverseAdjustment(
                actor, sourceTransactionId, request.reason_code(), request.expected_version());
        return InventoryMapper.transaction(transaction);
    }
}
