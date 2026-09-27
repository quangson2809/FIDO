package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.dto.request.GoodsReceiptActionRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptCreateRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptPatchRequest;
import com.fido.modules.inventory.dto.response.GoodsReceiptDetailDto;
import com.fido.modules.inventory.entity.GoodsReceipt;
import com.fido.modules.inventory.entity.GoodsReceiptItem;
import com.fido.modules.inventory.repository.GoodsReceiptItemRepository;
import com.fido.modules.inventory.repository.GoodsReceiptRepository;
import com.fido.modules.inventory.repository.SupplierRepository;
import com.fido.modules.product.service.CatalogVariantReferenceService;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class GoodsReceiptService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final GoodsReceiptRepository receipts;
    private final GoodsReceiptItemRepository items;
    private final SupplierRepository suppliers;
    private final CatalogVariantReferenceService variants;
    private final InventoryCommandService inventoryCommands;
    private final GoodsReceiptQueryService query;
    private final AuditService audit;

    public GoodsReceiptService(
            GoodsReceiptRepository receipts,
            GoodsReceiptItemRepository items,
            SupplierRepository suppliers,
            CatalogVariantReferenceService variants,
            InventoryCommandService inventoryCommands,
            GoodsReceiptQueryService query,
            AuditService audit
    ) {
        this.receipts = receipts;
        this.items = items;
        this.suppliers = suppliers;
        this.variants = variants;
        this.inventoryCommands = inventoryCommands;
        this.query = query;
        this.audit = audit;
    }

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto create(
            Long actor,
            GoodsReceiptCreateRequest request
    ) {
        requireActiveSupplier(request.supplier_id());

        var requestedItems = createItems(request.items());
        validateItems(requestedItems);

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
                requestedItems
        );

        audit.record(
                actor,
                "GOODS_RECEIPT_CREATE",
                "GOODS_RECEIPT",
                receipt.getReceiptId()
        );

        return query.detailInternal(receipt);
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
            var requestedItems = patchItems(request.getItems());
            validateItems(requestedItems);

            items.deleteByReceiptId(receiptId);

            saveItems(
                    receiptId,
                    requestedItems
            );
        }

        audit.record(
                actor,
                "GOODS_RECEIPT_UPDATE",
                "GOODS_RECEIPT",
                receiptId
        );

        return query.detailInternal(receipt);
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
            return query.detailInternal(current);
        }

        if (!InventoryPolicy.RECEIPT_DRAFT.equals(
                current.getReceiptStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        var receiptItems =
                items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId);

        validateStoredItems(receiptItems);

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        int transitioned = receipts.confirmDraft(
                receiptId,
                actor,
                now
        );

        if (transitioned == 0) {
            GoodsReceipt after = receipt(receiptId);

            if (InventoryPolicy.RECEIPT_CONFIRMED.equals(
                    after.getReceiptStatus()
            )) {
                return query.detailInternal(after);
            }

            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

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

        return query.detailInternal(
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
            return query.detailInternal(current);
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

        return query.detailInternal(
                receipt(receiptId)
        );
    }

    private void saveItems(
            Long receiptId,
            List<ReceiptItemInput> requested
    ) {
        for (var item : requested) {
            GoodsReceiptItem row = new GoodsReceiptItem();
            row.setReceiptId(receiptId);
            row.setVariantId(item.variantId());
            row.setQuantity(item.quantity());

            items.save(row);
        }
    }

    private void validateItems(List<ReceiptItemInput> requested) {
        var variantIds = new HashSet<Long>();

        for (var item : requested) {
            validateVariant(item.variantId());

            if (!variantIds.add(item.variantId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
        }
    }

    private List<ReceiptItemInput> createItems(
            List<GoodsReceiptCreateRequest.ItemInput> requested
    ) {
        return requested.stream()
                .map(item ->
                        new ReceiptItemInput(
                                item.variant_id(),
                                item.quantity()
                        )
                )
                .toList();
    }

    private List<ReceiptItemInput> patchItems(
            List<GoodsReceiptPatchRequest.ItemInput> requested
    ) {
        return requested.stream()
                .map(item ->
                        new ReceiptItemInput(
                                item.variant_id(),
                                item.quantity()
                        )
                )
                .toList();
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
        variants.requireExists(variantId);
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

    private record ReceiptItemInput(
            Long variantId,
            Integer quantity
    ) {
    }

}
