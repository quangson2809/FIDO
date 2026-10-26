package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.dto.response.InventoryReconciliationRowDto;
import com.fido.modules.inventory.repository.InventoryReconciliationView;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InventoryReconciliationService {
    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";
    private final InventoryTransactionRepository transactions;

    public InventoryReconciliationService(InventoryTransactionRepository transactions) {
        this.transactions = transactions;
    }

    @PreAuthorize(READ)
    public ApiListResponse<InventoryReconciliationRowDto> reconcile(Integer page, Integer pageSize) {
        Pagination pagination = Pagination.of(page, pageSize);
        Page<InventoryReconciliationView> result = transactions.reconcile(pagination.toPageable());
        var rows = result.getContent().stream().map(row -> {
            boolean quantityMatches = Boolean.TRUE.equals(row.getQuantityMatches());
            boolean versionMatches = Boolean.TRUE.equals(row.getVersionMatches());
            return new InventoryReconciliationRowDto(
                    row.getWarehouseId(),
                    row.getProductId(),
                    row.getBalanceQuantity(),
                    row.getBalanceVersion(),
                    row.getLedgerQuantity(),
                    row.getMovementCount(),
                    quantityMatches,
                    versionMatches,
                    quantityMatches && versionMatches);
        }).toList();
        return ApiListResponse.of(rows, pagination.meta(result.getTotalElements()));
    }
}
