package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.inventory.dto.request.GoodsReceiptActionRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptCreateRequest;
import com.fido.modules.inventory.dto.request.GoodsReceiptPatchRequest;
import com.fido.modules.inventory.dto.response.GoodsReceiptDetailDto;
import com.fido.modules.inventory.entity.GoodsReceipt;
import com.fido.modules.inventory.entity.GoodsReceiptItem;
import com.fido.modules.inventory.repository.GoodsReceiptItemRepository;
import com.fido.modules.inventory.repository.GoodsReceiptRepository;
import com.fido.modules.inventory.repository.SupplierRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class GoodsReceiptService {
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final GoodsReceiptRepository receipts;
    private final GoodsReceiptItemRepository items;
    private final SupplierRepository suppliers;
    private final InventoryCommandService inventoryCommands;
    private final GoodsReceiptQueryService query;
    private final OperationalWarehouseService operationalWarehouse;
    private final AuditWriteService audit;

    public GoodsReceiptService(
            GoodsReceiptRepository receipts,
            GoodsReceiptItemRepository items,
            SupplierRepository suppliers,
            InventoryCommandService inventoryCommands,
            GoodsReceiptQueryService query,
            OperationalWarehouseService operationalWarehouse,
            AuditWriteService audit) {
        this.receipts = receipts;
        this.items = items;
        this.suppliers = suppliers;
        this.inventoryCommands = inventoryCommands;
        this.query = query;
        this.operationalWarehouse = operationalWarehouse;
        this.audit = audit;
    }

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto create(Long actor, GoodsReceiptCreateRequest request) {
        requireActiveSupplier(request.supplier_id());
        Long warehouseId = operationalWarehouse.requireOperationalWarehouseId();
        var requestedItems = createItems(request.items());
        validateItems(requestedItems);

        GoodsReceipt receipt = new GoodsReceipt();
        receipt.setReceiptCode(generateReceiptCode());
        receipt.setSupplierId(request.supplier_id());
        receipt.setWarehouseId(warehouseId);
        receipt.setReceiptStatus(InventoryPolicy.RECEIPT_DRAFT);
        receipt.setCreatedByAccountId(actor);
        receipts.save(receipt);
        saveItems(receipt.getReceiptId(), requestedItems);

        audit.record(AuditWriteEvent.withChanges(
                AuditAction.GOODS_RECEIPT_CREATE,
                AuditEntityType.GOODS_RECEIPT,
                receipt.getReceiptId().toString(),
                Map.of(),
                snapshot(receipt.getReceiptStatus(), warehouseId,
                        items.findAllByReceiptIdOrderByReceiptItemIdAsc(receipt.getReceiptId()))));
        return query.detailInternal(receipt);
    }

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto update(Long actor, Long receiptId, GoodsReceiptPatchRequest request) {
        GoodsReceipt receipt = receiptForUpdate(receiptId);
        requireDraft(receipt);
        List<GoodsReceiptItem> beforeItems =
                items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId);
        Map<String, Object> before = snapshot(receipt.getReceiptStatus(), receipt.getWarehouseId(), beforeItems);

        if (request.getSupplierId() != null) {
            requireActiveSupplier(request.getSupplierId());
            receipt.setSupplierId(request.getSupplierId());
        }

        if (request.isItemsPresent()) {
            var requestedItems = patchItems(request.getItems());
            validateItems(requestedItems);
            items.deleteByReceiptId(receiptId);
            saveItems(receiptId, requestedItems);
        }
        receipts.save(receipt);

        List<GoodsReceiptItem> afterItems =
                items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId);
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.GOODS_RECEIPT_UPDATE,
                AuditEntityType.GOODS_RECEIPT,
                receiptId.toString(),
                before,
                snapshot(receipt.getReceiptStatus(), receipt.getWarehouseId(), afterItems)));
        return query.detailInternal(receipt);
    }

    @PreAuthorize(WRITE)
    public GoodsReceiptDetailDto action(Long actor, Long receiptId, GoodsReceiptActionRequest request) {
        return switch (request.action()) {
            case "CONFIRM" -> confirm(actor, receiptId);
            case "CANCEL" -> cancel(actor, receiptId);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        };
    }

    private GoodsReceiptDetailDto confirm(Long actor, Long receiptId) {
        // Source aggregate is locked before source lines or inventory balance rows.
        GoodsReceipt current = receiptForUpdate(receiptId);
        if (InventoryPolicy.RECEIPT_CONFIRMED.equals(current.getReceiptStatus())) {
            return query.detailInternal(current);
        }
        if (!InventoryPolicy.RECEIPT_DRAFT.equals(current.getReceiptStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_INVALID_STATE");
        }

        List<GoodsReceiptItem> receiptItems =
                items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId);
        if (receiptItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_EMPTY");
        }
        validateStoredItems(receiptItems);
        Map<String, Object> before =
                snapshot(current.getReceiptStatus(), current.getWarehouseId(), receiptItems);

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        current.setReceiptStatus(InventoryPolicy.RECEIPT_CONFIRMED);
        current.setConfirmedByAccountId(actor);
        current.setConfirmedAt(now);
        current.setUpdatedAt(now);

        var stockLines = receiptItems.stream()
                .map(item -> new InventoryCommandService.StockLine(
                        item.getProductId(), item.getQuantity(), null, item.getReceiptItemId()))
                .toList();

        // Inventory writes balance/version and immutable semantic-source ledger keys in this transaction.
        inventoryCommands.receiveGoods(actor, receiptId, current.getWarehouseId(), stockLines);

        audit.record(AuditWriteEvent.withChanges(
                AuditAction.GOODS_RECEIPT_CONFIRM,
                AuditEntityType.GOODS_RECEIPT,
                receiptId.toString(),
                before,
                snapshot(current.getReceiptStatus(), current.getWarehouseId(), receiptItems)));
        return query.detailInternal(current);
    }

    private GoodsReceiptDetailDto cancel(Long actor, Long receiptId) {
        GoodsReceipt current = receiptForUpdate(receiptId);
        if (InventoryPolicy.RECEIPT_CANCELLED.equals(current.getReceiptStatus())) {
            return query.detailInternal(current);
        }
        if (!InventoryPolicy.RECEIPT_DRAFT.equals(current.getReceiptStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_INVALID_STATE");
        }

        List<GoodsReceiptItem> currentItems =
                items.findAllByReceiptIdOrderByReceiptItemIdAsc(receiptId);
        Map<String, Object> before =
                snapshot(current.getReceiptStatus(), current.getWarehouseId(), currentItems);
        current.setReceiptStatus(InventoryPolicy.RECEIPT_CANCELLED);
        current.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.GOODS_RECEIPT_CANCEL,
                AuditEntityType.GOODS_RECEIPT,
                receiptId.toString(),
                before,
                snapshot(current.getReceiptStatus(), current.getWarehouseId(), currentItems)));
        return query.detailInternal(current);
    }

    private Map<String, Object> snapshot(String status, Long warehouseId, List<GoodsReceiptItem> rows) {
        long totalQuantity = rows.stream()
                .map(item -> (long) item.getQuantity())
                .reduce(0L, Math::addExact);
        return Map.of(
                "status", status,
                "warehouse_id", warehouseId,
                "item_count", rows.size(),
                "total_quantity", totalQuantity);
    }

    private void saveItems(Long receiptId, List<ReceiptItemInput> requested) {
        for (var item : requested) {
            GoodsReceiptItem row = new GoodsReceiptItem();
            row.setReceiptId(receiptId);
            row.setProductId(item.productId());
            row.setUnitCost(item.unitCost());
            row.setQuantity(item.quantity());
            items.save(row);
        }
    }

    private void validateItems(List<ReceiptItemInput> requested) {
        if (requested == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var productIds = new HashSet<Long>();
        for (var item : requested) {
            if (item == null || item.productId() == null || item.quantity() == null
                    || item.quantity() <= 0 || item.unitCost() == null || item.unitCost() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
            }
            inventoryCommands.requireTrackedProduct(item.productId());
            if (!productIds.add(item.productId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_DUPLICATE_PRODUCT");
            }
        }
    }

    private List<ReceiptItemInput> createItems(List<GoodsReceiptCreateRequest.ItemInput> requested) {
        if (requested == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return requested.stream()
                .map(item -> {
                    if (item == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
                    return new ReceiptItemInput(item.product_id(), item.quantity_received(), item.unit_cost());
                })
                .toList();
    }

    private List<ReceiptItemInput> patchItems(List<GoodsReceiptPatchRequest.ItemInput> requested) {
        if (requested == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return requested.stream()
                .map(item -> {
                    if (item == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
                    return new ReceiptItemInput(item.product_id(), item.quantity_received(), item.unit_cost());
                })
                .toList();
    }

    private void validateStoredItems(List<GoodsReceiptItem> storedItems) {
        if (storedItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_EMPTY");
        }
        var productIds = new HashSet<Long>();
        for (GoodsReceiptItem item : storedItems) {
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_INVALID_ITEM");
            }
            inventoryCommands.requireTrackedProduct(item.getProductId());
            if (!productIds.add(item.getProductId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_DUPLICATE_PRODUCT");
            }
        }
    }

    private void requireActiveSupplier(Long supplierId) {
        var supplier = suppliers.findById(supplierId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!InventoryPolicy.SUPPLIER_ACTIVE.equals(supplier.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private GoodsReceipt receiptForUpdate(Long receiptId) {
        return receipts.findByIdForUpdate(receiptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private void requireDraft(GoodsReceipt receipt) {
        if (!InventoryPolicy.RECEIPT_DRAFT.equals(receipt.getReceiptStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_INVALID_STATE");
        }
    }

    private String generateReceiptCode() {
        return "GR-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
    }

    private record ReceiptItemInput(Long productId, Integer quantity, Long unitCost) {}
}
