package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.inventory.dto.request.InventoryAdjustmentRequest;
import com.fido.modules.inventory.dto.response.InventoryTransactionDto;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.mapper.InventoryMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class InventoryAdjustmentService {
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";
    private final InventoryCommandService inventoryCommands;
    private final AuditService audit;

    public InventoryAdjustmentService(InventoryCommandService inventoryCommands, AuditService audit) {
        this.inventoryCommands = inventoryCommands;
        this.audit = audit;
    }

    @PreAuthorize(WRITE)
    public InventoryTransactionDto adjust(
            Long actor,
            InventoryAdjustmentRequest request
    ) {
        if (request.quantity_delta() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        InventoryTransaction transaction =
                inventoryCommands.adjustManually(
                        actor,
                        request.variant_id(),
                        request.quantity_delta(),
                        request.reason()
                );

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.INVENTORY_ADJUST,
                        AuditTargetType.INVENTORY,
                        request.variant_id()
                )
        );

        return InventoryMapper.transaction(transaction);
    }

}
