package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import com.fido.modules.product.service.CatalogVariantReferenceService;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Single write boundary for sellable inventory and its immutable ledger.
 * Callers describe the business event; this service owns stock mutation details.
 */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryCommandService {

    private final InventoryRepository inventories;
    private final InventoryTransactionRepository transactions;
    private final CatalogVariantReferenceService variants;

    public InventoryCommandService(
            InventoryRepository inventories,
            InventoryTransactionRepository transactions,
            CatalogVariantReferenceService variants
    ) {
        this.inventories = inventories;
        this.transactions = transactions;
        this.variants = variants;
    }

    public void receiveGoods(
            Long actor,
            Long receiptId,
            List<StockLine> lines
    ) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (StockLine line : lines) {
            ensureInventoryRow(line.variantId());

            increment(
                    line.variantId(),
                    line.quantity(),
                    now
            );

            record(
                    actor,
                    line.variantId(),
                    line.quantity(),
                    InventoryPolicy.RECEIPT_IN,
                    null,
                    receiptId,
                    null
            );
        }
    }

    public InventoryTransaction adjustManually(
            Long actor,
            Long variantId,
            int quantityDelta,
            String reason
    ) {
        requireVariantExists(variantId);
        ensureInventoryRow(variantId);

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        int updated = inventories.adjustIfNonNegative(
                variantId,
                quantityDelta,
                now
        );

        if (updated != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        return record(
                actor,
                variantId,
                quantityDelta,
                quantityDelta > 0
                        ? InventoryPolicy.ADJUSTMENT_IN
                        : InventoryPolicy.ADJUSTMENT_OUT,
                null,
                null,
                reason
        );
    }

    public void deductConfirmedOrder(
            Long actor,
            Long orderId,
            List<StockLine> lines,
            String reason
    ) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (StockLine line : lines) {
            int updated = inventories.adjustIfNonNegative(
                    line.variantId(),
                    -line.quantity(),
                    now
            );

            if (updated != 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }

            record(
                    actor,
                    line.variantId(),
                    -line.quantity(),
                    InventoryPolicy.ORDER_CONFIRM_OUT,
                    orderId,
                    null,
                    reason
            );
        }
    }

    public void restoreCancelledOrder(
            Long actor,
            Long orderId,
            List<StockLine> lines,
            String reason
    ) {
        restoreOrderStock(
                actor,
                orderId,
                lines,
                InventoryPolicy.ORDER_CANCEL_IN,
                reason
        );
    }

    public void restoreDeliveryReturn(
            Long actor,
            Long orderId,
            List<StockLine> lines,
            String reason
    ) {
        restoreOrderStock(
                actor,
                orderId,
                lines,
                InventoryPolicy.DELIVERY_RETURN_IN,
                reason
        );
    }

    @Transactional(readOnly = true)
    public OrderStockState orderStockState(Long orderId) {
        return new OrderStockState(
                hasMovement(orderId, InventoryPolicy.ORDER_CONFIRM_OUT),
                hasMovement(orderId, InventoryPolicy.ORDER_CANCEL_IN),
                hasMovement(orderId, InventoryPolicy.DELIVERY_RETURN_IN)
        );
    }

    private void restoreOrderStock(
            Long actor,
            Long orderId,
            List<StockLine> lines,
            String transactionType,
            String reason
    ) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (StockLine line : lines) {
            increment(
                    line.variantId(),
                    line.quantity(),
                    now
            );

            record(
                    actor,
                    line.variantId(),
                    line.quantity(),
                    transactionType,
                    orderId,
                    null,
                    reason
            );
        }
    }

    private void increment(
            Long variantId,
            int quantity,
            LocalDateTime now
    ) {
        int updated = inventories.increment(
                variantId,
                quantity,
                now
        );

        if (updated != 1) {
            throw new IllegalStateException(
                    "Inventory row missing during stock mutation"
            );
        }
    }

    private InventoryTransaction record(
            Long actor,
            Long variantId,
            int quantityDelta,
            String transactionType,
            Long orderId,
            Long receiptId,
            String reason
    ) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setVariantId(variantId);
        transaction.setQuantityDelta(quantityDelta);
        transaction.setTransactionType(transactionType);
        transaction.setOrderId(orderId);
        transaction.setGoodsReceiptId(receiptId);
        transaction.setActorAccountId(actor);
        transaction.setReason(normalize(reason));

        return transactions.save(transaction);
    }

    private boolean hasMovement(
            Long orderId,
            String transactionType
    ) {
        return transactions.existsByOrderIdAndTransactionType(
                orderId,
                transactionType
        );
    }

    private void requireVariantExists(Long variantId) {
        variants.requireExists(variantId);
    }

    private void ensureInventoryRow(Long variantId) {
        if (inventories.findById(variantId).isPresent()) {
            return;
        }

        Inventory inventory = new Inventory();
        inventory.setVariantId(variantId);
        inventory.setAvailableQuantity(0);

        inventories.save(inventory);
    }

    private String normalize(String reason) {
        if (reason == null || reason.isBlank()) {
            return null;
        }

        return reason.trim();
    }

    public record StockLine(
            Long variantId,
            int quantity
    ) {
        public StockLine {
            if (variantId == null || quantity <= 0) {
                throw new IllegalArgumentException(
                        "Stock line requires variant and positive quantity"
                );
            }
        }
    }

    public record OrderStockState(
            boolean deducted,
            boolean cancellationRestored,
            boolean deliveryReturned
    ) {
        public boolean restored() {
            return cancellationRestored || deliveryReturned;
        }
    }
}
