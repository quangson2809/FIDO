package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.dto.request.InventoryAdjustmentRequest;
import com.fido.modules.inventory.dto.response.InventoryRowDto;
import com.fido.modules.inventory.dto.response.InventoryTransactionDto;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.mapper.InventoryMapper;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class InventoryAdminService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final InventoryCommandService inventoryCommands;
    private final AuditService audit;

    public InventoryAdminService(
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            InventoryCommandService inventoryCommands,
            AuditService audit
    ) {
        this.inventories = inventories;
        this.transactions = transactions;
        this.inventoryCommands = inventoryCommands;
        this.audit = audit;
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public ApiListResponse<InventoryRowDto> inventory(
            Long variantId,
            String sku,
            Long productId,
            Long sizeValueId,
            Long colorId,
            Integer page,
            Integer pageSize
    ) {
        Pagination pagination = Pagination.of(page, pageSize);

        var result = inventories.search(
                variantId,
                normalize(sku),
                productId,
                sizeValueId,
                colorId,
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(InventoryMapper::inventoryRow)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
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
                actor,
                "INVENTORY_ADJUST",
                "INVENTORY",
                request.variant_id()
        );

        return InventoryMapper.transaction(transaction);
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public ApiListResponse<InventoryTransactionDto> transactions(
            Long variantId,
            String transactionType,
            Long orderId,
            Long goodsReceiptId,
            Long actorAccountId,
            LocalDateTime from,
            LocalDateTime to,
            Integer page,
            Integer pageSize
    ) {
        if (from != null
                && to != null
                && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Pagination pagination = Pagination.of(page, pageSize);

        var result = transactions.findAll(
                transactionSpec(
                        variantId,
                        transactionType,
                        orderId,
                        goodsReceiptId,
                        actorAccountId,
                        from,
                        to
                ),
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(InventoryMapper::transaction)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    private Specification<InventoryTransaction> transactionSpec(
            Long variantId,
            String transactionType,
            Long orderId,
            Long goodsReceiptId,
            Long actorAccountId,
            LocalDateTime from,
            LocalDateTime to
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (variantId != null) {
                predicates.add(
                        cb.equal(root.get("variantId"), variantId)
                );
            }

            if (transactionType != null
                    && !transactionType.isBlank()) {
                predicates.add(
                        cb.equal(
                                root.get("transactionType"),
                                transactionType.trim()
                        )
                );
            }

            if (orderId != null) {
                predicates.add(
                        cb.equal(root.get("orderId"), orderId)
                );
            }

            if (goodsReceiptId != null) {
                predicates.add(
                        cb.equal(
                                root.get("goodsReceiptId"),
                                goodsReceiptId
                        )
                );
            }

            if (actorAccountId != null) {
                predicates.add(
                        cb.equal(
                                root.get("actorAccountId"),
                                actorAccountId
                        )
                );
            }

            if (from != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("createdAt"),
                                from
                        )
                );
            }

            if (to != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("createdAt"),
                                to
                        )
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}

