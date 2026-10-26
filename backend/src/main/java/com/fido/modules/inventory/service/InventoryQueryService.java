package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.dto.response.InventoryRowDto;
import com.fido.modules.inventory.dto.response.InventoryTransactionDto;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.mapper.InventoryMapper;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;

@Service
@Transactional(readOnly = true)
public class InventoryQueryService {
    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final OperationalWarehouseService operationalWarehouse;

    public InventoryQueryService(
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            OperationalWarehouseService operationalWarehouse) {
        this.inventories = inventories;
        this.transactions = transactions;
        this.operationalWarehouse = operationalWarehouse;
    }

    @PreAuthorize(READ)
    public ApiListResponse<InventoryRowDto> inventory(
            Long productId, String sku, Integer page, Integer pageSize) {
        Pagination pagination = Pagination.of(page, pageSize);
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        var result = inventories.search(
                productId, normalize(sku), warehouseId, pagination.toPageable());
        var data = result.getContent().stream().map(InventoryMapper::inventoryRow).toList();
        return ApiListResponse.of(data, pagination.meta(result.getTotalElements()));
    }

    @PreAuthorize(READ)
    public ApiListResponse<InventoryTransactionDto> transactions(InventoryTransactionFilter filter) {
        if (filter.from() != null && filter.to() != null && filter.from().isAfter(filter.to())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        Pagination pagination = Pagination.of(filter.page(), filter.pageSize());
        var result = transactions.findAll(transactionSpec(filter), pagination.toPageable());
        var data = result.getContent().stream().map(InventoryMapper::transaction).toList();
        return ApiListResponse.of(data, pagination.meta(result.getTotalElements()));
    }

    private Specification<InventoryTransaction> transactionSpec(InventoryTransactionFilter filter) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (filter.productId() != null) predicates.add(cb.equal(root.get("productId"), filter.productId()));
            if (filter.transactionType() != null && !filter.transactionType().isBlank()) {
                predicates.add(cb.equal(root.get("transactionType"), filter.transactionType().trim()));
            }
            if (filter.orderItemId() != null) predicates.add(cb.equal(root.get("orderItemId"), filter.orderItemId()));
            if (filter.goodsReceiptItemId() != null) {
                predicates.add(cb.equal(root.get("goodsReceiptItemId"), filter.goodsReceiptItemId()));
            }
            if (filter.actorAccountId() != null) {
                predicates.add(cb.equal(root.get("actorAccountId"), filter.actorAccountId()));
            }
            if (filter.from() != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.from()));
            if (filter.to() != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.to()));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
