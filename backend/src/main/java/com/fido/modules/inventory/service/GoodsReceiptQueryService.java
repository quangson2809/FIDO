package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.dto.response.GoodsReceiptDetailDto;
import com.fido.modules.inventory.dto.response.GoodsReceiptSummaryDto;
import com.fido.modules.inventory.entity.GoodsReceipt;
import com.fido.modules.inventory.mapper.InventoryMapper;
import com.fido.modules.inventory.repository.GoodsReceiptItemRepository;
import com.fido.modules.inventory.repository.GoodsReceiptRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class GoodsReceiptQueryService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";

    private final GoodsReceiptRepository receipts;
    private final GoodsReceiptItemRepository items;

    public GoodsReceiptQueryService(
            GoodsReceiptRepository receipts,
            GoodsReceiptItemRepository items
    ) {
        this.receipts = receipts;
        this.items = items;
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public ApiListResponse<GoodsReceiptSummaryDto> list(
            String receiptCode,
            Long supplierId,
            String receiptStatus,
            LocalDate dateFrom,
            LocalDate dateTo,
            Integer page,
            Integer pageSize
    ) {
        if (receiptStatus != null) {
            InventoryPolicy.requireReceiptStatus(receiptStatus);
        }

        if (dateFrom != null
                && dateTo != null
                && dateFrom.isAfter(dateTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Pagination pagination = pagination(page, pageSize);

        var result = receipts.findAll(
                receiptSpec(
                        receiptCode,
                        supplierId,
                        receiptStatus,
                        dateFrom,
                        dateTo
                ),
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(InventoryMapper::receiptSummary)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public GoodsReceiptDetailDto detail(Long receiptId) {
        return detailInternal(
                receipt(receiptId)
        );
    }

    GoodsReceiptDetailDto detailInternal(
            GoodsReceipt receipt
    ) {
        var receiptItems = items
                .findAllByReceiptIdOrderByReceiptItemIdAsc(
                        receipt.getReceiptId()
                )
                .stream()
                .map(InventoryMapper::receiptItem)
                .toList();

        return InventoryMapper.receiptDetail(
                receipt,
                receiptItems
        );
    }

    private GoodsReceipt receipt(Long receiptId) {
        return receipts.findById(receiptId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Specification<GoodsReceipt> receiptSpec(
            String receiptCode,
            Long supplierId,
            String receiptStatus,
            LocalDate dateFrom,
            LocalDate dateTo
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (receiptCode != null && !receiptCode.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("receiptCode")),
                                "%"
                                        + receiptCode.trim()
                                                .toLowerCase(Locale.ROOT)
                                        + "%"
                        )
                );
            }

            if (supplierId != null) {
                predicates.add(
                        cb.equal(
                                root.get("supplierId"),
                                supplierId
                        )
                );
            }

            if (receiptStatus != null) {
                predicates.add(
                        cb.equal(
                                root.get("receiptStatus"),
                                receiptStatus
                        )
                );
            }

            if (dateFrom != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("receiptDate"),
                                dateFrom
                        )
                );
            }

            if (dateTo != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("receiptDate"),
                                dateTo
                        )
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    private Pagination pagination(
            Integer page,
            Integer pageSize
    ) {
        try {
            return Pagination.of(page, pageSize);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }
}
