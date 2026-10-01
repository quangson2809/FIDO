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
import java.util.ArrayList;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class InventoryQueryService {
    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;

    public InventoryQueryService(InventoryRepository inventories,
                                 InventoryTransactionRepository transactions) {
        this.inventories = inventories;
        this.transactions = transactions;
    }

    @PreAuthorize(READ)
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

    @PreAuthorize(READ)
    public ApiListResponse<InventoryTransactionDto> transactions(
            InventoryTransactionFilter filter
    ) {
        if (filter.from() != null
                && filter.to() != null
                && filter.from().isAfter(filter.to())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Pagination pagination = Pagination.of(
                filter.page(),
                filter.pageSize()
        );

        var result = transactions.findAll(
                transactionSpec(filter),
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
            InventoryTransactionFilter filter
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (filter.variantId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("variantId"),
                                filter.variantId()
                        )
                );
            }

            if (filter.transactionType() != null
                    && !filter.transactionType().isBlank()) {
                predicates.add(
                        cb.equal(
                                root.get("transactionType"),
                                filter.transactionType().trim()
                        )
                );
            }

            if (filter.orderId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("orderId"),
                                filter.orderId()
                        )
                );
            }

            if (filter.goodsReceiptId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("goodsReceiptId"),
                                filter.goodsReceiptId()
                        )
                );
            }

            if (filter.actorAccountId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("actorAccountId"),
                                filter.actorAccountId()
                        )
                );
            }

            if (filter.from() != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("createdAt"),
                                filter.from()
                        )
                );
            }

            if (filter.to() != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("createdAt"),
                                filter.to()
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
