package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.dto.request.GoodsReceiptActionRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptCreateRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptPatchRequest;
import com.fido.modules.inventory.dto.response.GoodsReceiptDetailDto;
import com.fido.modules.inventory.dto.response.GoodsReceiptSummaryDto;
import com.fido.modules.inventory.entity.GoodsReceipt;
import com.fido.modules.inventory.entity.GoodsReceiptItem;
import com.fido.modules.inventory.mapper.InventoryMapper;
import com.fido.modules.inventory.repository.GoodsReceiptItemRepository;
import com.fido.modules.inventory.repository.GoodsReceiptRepository;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.SupplierRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class GoodsReceiptService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final GoodsReceiptRepository receipts;
    private final GoodsReceiptItemRepository items;
    private final SupplierRepository suppliers;
    private final InventoryRepository inventories;
    private final InventoryCommandService inventoryCommands;
    private final AuditService audit;

    public GoodsReceiptService(
            GoodsReceiptRepository receipts,
            GoodsReceiptItemRepository items,
            SupplierRepository suppliers,
            InventoryRepository inventories,
            InventoryCommandService inventoryCommands,
            AuditService audit
    ) {
        this.receipts = receipts;
        this.items = items;
        this.suppliers = suppliers;
        this.inventories = inventories;
        this.inventoryCommands = inventoryCommands;
        this.audit = audit;
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

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto create(
            Long actor,
            GoodsReceiptCreateRequest request
    ) {
        requireActiveSupplier(request.supplier_id());
        validateCreateItems(request.items());

        GoodsReceipt receipt = new GoodsReceipt();
        receipt.setReceiptCode(generateReceiptCode());
        receipt.setSupplierId(request.supplier_id());
        receipt.setReceiptStatus(InventoryPolicy.RECEIPT_DRAFT);
        receipt.setReceiptDate(request.receipt_date());
        receipt.setCreatedByAccountId(actor);
        receipt.setNote(request.note());

        receipts.save(receipt);

        saveItems(
                receipt.getReceiptId(),
                request.items()
        );

        audit.record(
                actor,
                "GOODS_RECEIPT_CREATE",
                "GOODS_RECEIPT",
                receipt.getReceiptId()
        );

        return detailInternal(receipt);
    }

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto update(
            Long actor,
            Long receiptId,
            GoodsReceiptPatchRequest request
    ) {
        GoodsReceipt receipt = receiptForUpdate(receiptId);

        requireDraft(receipt);

        if (request.getSupplierId() != null) {
            requireActiveSupplier(request.getSupplierId());
            receipt.setSupplierId(request.getSupplierId());
        }

        if (request.getReceiptDate() != null) {
            receipt.setReceiptDate(request.getReceiptDate());
        }

        if (request.isNotePresent()) {
            receipt.setNote(request.getNote());
        }

        receipts.save(receipt);

        if (request.isItemsPresent()) {
            validatePatchItems(request.getItems());

            items.deleteByReceiptId(receiptId);

            savePatchItems(
                    receiptId,
                    request.getItems()
            );
        }

        audit.record(
                actor,
                "GOODS_RECEIPT_UPDATE",
                "GOODS_RECEIPT",
                receiptId
        );

        return detailInternal(receipt);
    }

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto action(
            Long actor,
            Long receiptId,
            GoodsReceiptActionRequest request
    ) {
        return switch (request.action()) {
            case "CONFIRM" -> confirm(actor, receiptId);
            case "CANCEL" -> cancel(actor, receiptId);
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        };
    }

    private GoodsReceiptDetailDto confirm(
            Long actor,
            Long receiptId
    ) {
        GoodsReceipt current = receiptForUpdate(receiptId);

        if (InventoryPolicy.RECEIPT_CONFIRMED.equals(
                current.getReceiptStatus()
        )) {
            return detailInternal(current);
        }

        if (!InventoryPolicy.RECEIPT_DRAFT.equals(
                current.getReceiptStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var receiptItems =
                items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId);

        validateStoredItems(receiptItems);

        var stockLines = receiptItems.stream()
                .map(item ->
                        new InventoryCommandService.StockLine(
                                item.getVariantId(),
                                item.getQuantity()
                        )
                )
                .toList();

        inventoryCommands.receiveGoods(
                actor,
                receiptId,
                stockLines
        );

        audit.record(
                actor,
                "GOODS_RECEIPT_CONFIRM",
                "GOODS_RECEIPT",
                receiptId
        );

        return detailInternal(
                receipt(receiptId)
        );
    }

    private GoodsReceiptDetailDto cancel(
            Long actor,
            Long receiptId
    ) {
        GoodsReceipt current = receiptForUpdate(receiptId);

        if (InventoryPolicy.RECEIPT_CANCELLED.equals(
                current.getReceiptStatus()
        )) {
            return detailInternal(current);
        }

        if (!InventoryPolicy.RECEIPT_DRAFT.equals(
                current.getReceiptStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        int transitioned = receipts.cancelDraft(
                receiptId,
                LocalDateTime.now(ZoneOffset.UTC)
        );

        if (transitioned != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        audit.record(
                actor,
                "GOODS_RECEIPT_CANCEL",
                "GOODS_RECEIPT",
                receiptId
        );

        return detailInternal(
                receipt(receiptId)
        );
    }

    private GoodsReceiptDetailDto detailInternal(
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

    private void saveItems(
            Long receiptId,
            List<GoodsReceiptCreateRequest.ItemInput> requested
    ) {
        for (var item : requested) {
            GoodsReceiptItem row = new GoodsReceiptItem();
            row.setReceiptId(receiptId);
            row.setVariantId(item.variant_id());
            row.setQuantity(item.quantity());

            items.save(row);
        }
    }

    private void savePatchItems(
            Long receiptId,
            List<GoodsReceiptPatchRequest.ItemInput> requested
    ) {
        for (var item : requested) {
            GoodsReceiptItem row = new GoodsReceiptItem();
            row.setReceiptId(receiptId);
            row.setVariantId(item.variant_id());
            row.setQuantity(item.quantity());

            items.save(row);
        }
    }

    private void validateCreateItems(
            List<GoodsReceiptCreateRequest.ItemInput> requested
    ) {
        var variantIds = new HashSet<Long>();

        for (var item : requested) {
            validateVariant(item.variant_id());

            if (!variantIds.add(item.variant_id())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
        }
    }

    private void validatePatchItems(
            List<GoodsReceiptPatchRequest.ItemInput> requested
    ) {
        var variantIds = new HashSet<Long>();

        for (var item : requested) {
            validateVariant(item.variant_id());

            if (!variantIds.add(item.variant_id())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
        }
    }

    private void validateStoredItems(
            List<GoodsReceiptItem> storedItems
    ) {
        if (storedItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var variantIds = new HashSet<Long>();

        for (GoodsReceiptItem item : storedItems) {
            if (item.getQuantity() == null
                    || item.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }

            validateVariant(item.getVariantId());

            if (!variantIds.add(item.getVariantId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
        }
    }

    private void requireActiveSupplier(Long supplierId) {
        var supplier = suppliers.findById(supplierId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );

        if (!InventoryPolicy.SUPPLIER_ACTIVE.equals(
                supplier.getUsageStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private void validateVariant(Long variantId) {
        if (inventories.countVariant(variantId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private GoodsReceipt receipt(Long receiptId) {
        return receipts.findById(receiptId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private GoodsReceipt receiptForUpdate(Long receiptId) {
        return receipts.findByIdForUpdate(receiptId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private void requireDraft(GoodsReceipt receipt) {
        if (!InventoryPolicy.RECEIPT_DRAFT.equals(
                receipt.getReceiptStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private String generateReceiptCode() {
        return "GR-"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .toUpperCase(Locale.ROOT);
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
