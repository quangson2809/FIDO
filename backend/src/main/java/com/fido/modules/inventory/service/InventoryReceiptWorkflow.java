package com.fido.modules.inventory.service;

import static com.fido.modules.inventory.service.InventoryPostingService.sortByProductAndSourceId;

import com.fido.modules.inventory.entity.GoodsReceiptItem;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.GoodsReceiptItemRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.inventory.service.InventoryCommandService.StockLine;
import com.fido.modules.inventory.service.InventoryPostingService.InventoryMovement;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Component
class InventoryReceiptWorkflow {
    private final InventoryTransactionRepository transactions;
    private final GoodsReceiptItemRepository receiptItems;
    private final OperationalWarehouseService operationalWarehouse;
    private final InventoryPostingService posting;

    InventoryReceiptWorkflow(
            InventoryTransactionRepository transactions,
            GoodsReceiptItemRepository receiptItems,
            OperationalWarehouseService operationalWarehouse,
            InventoryPostingService posting) {
        this.transactions = transactions;
        this.receiptItems = receiptItems;
        this.operationalWarehouse = operationalWarehouse;
        this.posting = posting;
    }

    void receiveGoods(Long actor, Long receiptId, Long warehouseId, List<StockLine> lines) {
        operationalWarehouse.requireOperationalWarehouse(warehouseId);
        if (actor == null
                || actor <= 0
                || receiptId == null
                || receiptId <= 0
                || lines == null
                || lines.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "GOODS_RECEIPT_INVALID_SOURCE");
        }

        List<StockLine> orderedLines = sortByProductAndSourceId(lines);
        Set<Long> receiptItemIds = new HashSet<>();
        Set<Long> productIds = new HashSet<>();
        int alreadyPosted = 0;

        // Validate all sources and all existing semantic keys before mutating the first balance.
        for (StockLine line : orderedLines) {
            if (line.goodsReceiptItemId() == null
                    || !receiptItemIds.add(line.goodsReceiptItemId())
                    || !productIds.add(line.productId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }
            GoodsReceiptItem source =
                    receiptItems
                            .findById(line.goodsReceiptItemId())
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.CONFLICT,
                                                    "INVENTORY_SOURCE_CONFLICT"));
            if (!Objects.equals(source.getReceiptId(), receiptId)
                    || !Objects.equals(source.getProductId(), line.productId())
                    || !Objects.equals(source.getQuantity(), line.quantity())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }

            String semanticKey = receiptMovementKey(source.getReceiptItemId());
            List<InventoryTransaction> bySource =
                    transactions.findAllByGoodsReceiptItemIdAndTransactionType(
                            source.getReceiptItemId(), InventoryPolicy.RECEIPT_IN);
            if (bySource.size() > 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }
            var byKey = transactions.findByIdempotencyKey(semanticKey);
            if (bySource.isEmpty()) {
                if (byKey.isPresent()) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT, "INVENTORY_IDEMPOTENCY_CONFLICT");
                }
                continue;
            }

            InventoryTransaction existing = bySource.get(0);
            if (byKey.isEmpty()
                    || !Objects.equals(existing.getTxnId(), byKey.get().getTxnId())
                    || !matchesReceiptMovement(existing, semanticKey, warehouseId, line)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
            }
            alreadyPosted++;
        }

        if (alreadyPosted == orderedLines.size()) return;
        if (alreadyPosted != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVENTORY_SOURCE_CONFLICT");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : orderedLines) {
            posting.post(
                    new InventoryMovement(
                            actor,
                            warehouseId,
                            line.productId(),
                            line.quantity(),
                            InventoryPolicy.RECEIPT_IN,
                            null,
                            line.goodsReceiptItemId(),
                            null,
                            null),
                    now,
                    receiptMovementKey(line.goodsReceiptItemId()));
        }
    }

    private boolean matchesReceiptMovement(
            InventoryTransaction existing, String semanticKey, Long warehouseId, StockLine line) {
        return Objects.equals(existing.getIdempotencyKey(), semanticKey)
                && Objects.equals(existing.getTransactionType(), InventoryPolicy.RECEIPT_IN)
                && Objects.equals(existing.getWarehouseId(), warehouseId)
                && Objects.equals(existing.getProductId(), line.productId())
                && Objects.equals(existing.getQuantityDelta(), line.quantity())
                && Objects.equals(existing.getGoodsReceiptItemId(), line.goodsReceiptItemId())
                && existing.getOrderItemId() == null
                && existing.getReversesTransactionId() == null
                && existing.getReason() == null;
    }

    private String receiptMovementKey(Long receiptItemId) {
        return "goods-receipt-item:" + receiptItemId + ":GOODS_RECEIPT";
    }
}
