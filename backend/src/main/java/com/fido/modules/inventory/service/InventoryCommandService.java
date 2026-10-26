package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.product.entity.Product;

import jakarta.persistence.EntityManager;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryCommandService {

    private final EntityManager em;
    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;

    public InventoryCommandService(
            EntityManager em,
            InventoryRepository inventories,
            InventoryTransactionRepository transactions) {
        this.em = em;
        this.inventories = inventories;
        this.transactions = transactions;
    }

    public void receiveGoods(
            Long actor, Long receiptId, Long warehouseId, List<StockLine> lines) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : ordered(lines)) {
            requireTrackedProduct(line.productId());
            ensureInventoryRow(warehouseId, line.productId());
            increment(warehouseId, line.productId(), line.quantity(), now);
            record(new InventoryMovement(
                    actor, warehouseId, line.productId(), line.quantity(),
                    InventoryPolicy.RECEIPT_IN, null, line.goodsReceiptItemId(), null, null));
        }
    }

    public InventoryTransaction adjustManually(
            Long actor, Long warehouseId, Long productId, int quantityDelta, String reason) {
        requireTrackedProduct(productId);
        if (inventories.findByWarehouseIdAndProductId(warehouseId, productId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        int updated = inventories.adjustIfNonNegative(warehouseId, productId, quantityDelta, now);
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT);

        refreshInventory(warehouseId, productId);
        return record(new InventoryMovement(
                actor, warehouseId, productId, quantityDelta, InventoryPolicy.ADJUSTMENT,
                null, null, null, reason));
    }

    public void deductConfirmedOrder(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        for (StockLine line : ordered(lines)) {
            int remaining = line.quantity();
            var stockRows = inventories.findAllByProductIdIn(List.of(line.productId())).stream()
                    .sorted(Comparator.comparing(Inventory::getWarehouseId))
                    .toList();

            for (Inventory stock : stockRows) {
                if (remaining == 0) break;
                int available = stock.getQuantityOnHand() == null ? 0 : stock.getQuantityOnHand();
                int quantity = Math.min(remaining, available);
                if (quantity <= 0) continue;

                int updated = inventories.adjustIfNonNegative(
                        stock.getWarehouseId(), line.productId(), -quantity, now);
                if (updated != 1) continue;

                refreshInventory(stock.getWarehouseId(), line.productId());
                record(new InventoryMovement(
                        actor, stock.getWarehouseId(), line.productId(), -quantity,
                        InventoryPolicy.ORDER_CONFIRM_OUT, line.orderItemId(), null, null, reason));
                remaining -= quantity;
            }
            if (remaining > 0) throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    public void restoreCancelledOrder(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        restoreOrderStock(actor, orderId, lines, InventoryPolicy.ORDER_CANCEL_IN, reason);
    }

    public void restoreDeliveryReturn(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        restoreOrderStock(actor, orderId, lines, InventoryPolicy.DELIVERY_RETURN_IN, reason);
    }

    private void restoreOrderStock(
            Long actor, Long orderId, List<StockLine> lines, String transactionType, String reason) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        List<Long> itemIds = lines.stream().map(StockLine::orderItemId)
                .filter(java.util.Objects::nonNull).distinct().toList();

        if (!itemIds.isEmpty()) {
            var originalMovements = transactions
                    .findAllByOrderItemIdInAndTransactionType(
                            itemIds, InventoryPolicy.ORDER_CONFIRM_OUT)
                    .stream().sorted(Comparator.comparing(InventoryTransaction::getTxnId)).toList();
            for (InventoryTransaction original : originalMovements) {
                int quantity = Math.negateExact(original.getQuantityDelta());
                increment(original.getWarehouseId(), original.getProductId(), quantity, now);
                record(new InventoryMovement(
                        actor, original.getWarehouseId(), original.getProductId(), quantity,
                        transactionType, original.getOrderItemId(), null,
                        original.getTxnId(), reason));
            }
            return;
        }

        // Compatibility for internal callers without order-item references.
        for (StockLine line : ordered(lines)) {
            var rows = inventories.findAllByProductIdIn(List.of(line.productId())).stream()
                    .sorted(Comparator.comparing(Inventory::getWarehouseId)).toList();
            if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            Inventory stock = rows.get(0);
            increment(stock.getWarehouseId(), line.productId(), line.quantity(), now);
            record(new InventoryMovement(
                    actor, stock.getWarehouseId(), line.productId(), line.quantity(),
                    transactionType, null, null, null, reason));
        }
    }

    private void increment(Long warehouseId, Long productId, int quantity, LocalDateTime now) {
        int updated = inventories.increment(warehouseId, productId, quantity, now);
        if (updated != 1) throw new IllegalStateException("Inventory row missing during stock mutation");
        refreshInventory(warehouseId, productId);
    }

    private List<StockLine> ordered(List<StockLine> lines) {
        return lines.stream().sorted(Comparator.comparing(StockLine::productId)
                .thenComparing(line -> line.orderItemId() == null ? 0L : line.orderItemId())).toList();
    }

    private void refreshInventory(Long warehouseId, Long productId) {
        em.refresh(em.getReference(Inventory.class, new Inventory.InventoryId(warehouseId, productId)));
    }

    private void ensureInventoryRow(Long warehouseId, Long productId) {
        if (inventories.findByWarehouseIdAndProductId(warehouseId, productId).isPresent()) return;
        Inventory inventory = new Inventory();
        inventory.setWarehouseId(warehouseId);
        inventory.setProductId(productId);
        inventory.setQuantityOnHand(0);
        inventories.save(inventory);
        em.flush();
    }

    private InventoryTransaction record(InventoryMovement movement) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setWarehouseId(movement.warehouseId());
        transaction.setProductId(movement.productId());
        transaction.setQuantityDelta(movement.quantityDelta());
        transaction.setTransactionType(movement.transactionType());
        transaction.setOrderItemId(movement.orderItemId());
        transaction.setGoodsReceiptItemId(movement.goodsReceiptItemId());
        transaction.setIdempotencyKey(UUID.randomUUID().toString());
        transaction.setReversesTransactionId(movement.reversesTransactionId());
        transaction.setActorAccountId(movement.actor());
        transaction.setReason(normalize(movement.reason()));
        return transactions.save(transaction);
    }

    public void requireTrackedProduct(Long productId) {
        Product product = em.find(Product.class, productId);
        if (product == null || product.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private String normalize(String reason) {
        if (reason == null || reason.isBlank()) return null;
        String trimmed = reason.trim();
        return trimmed.length() <= 80 ? trimmed : trimmed.substring(0, 80);
    }

    private record InventoryMovement(
            Long actor,
            Long warehouseId,
            Long productId,
            int quantityDelta,
            String transactionType,
            Long orderItemId,
            Long goodsReceiptItemId,
            Long reversesTransactionId,
            String reason) {}

    public record StockLine(
            Long productId, int quantity, Long orderItemId, Long goodsReceiptItemId) {
        public StockLine(Long productId, int quantity) {
            this(productId, quantity, null, null);
        }

        public StockLine(Long productId, int quantity, Long orderItemId) {
            this(productId, quantity, orderItemId, null);
        }

        public StockLine {
            if (productId == null || quantity <= 0) {
                throw new IllegalArgumentException("Stock line requires Product ID and positive quantity");
            }
        }
    }
}
