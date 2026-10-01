package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.inventory.repository.InventoryRepository;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
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

    public InventoryCommandService(
            InventoryRepository inventories,
            InventoryTransactionRepository transactions
    ) {
        this.inventories = inventories;
        this.transactions = transactions;
    }

    public void receiveGoods(
            Long actor,
            Long receiptId,
            List<StockLine> lines
    ) {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (StockLine line : lines) {
            requireTrackedVariant(line.variantId());

            increment(
                    line.variantId(),
                    line.quantity(),
                    now
            );

            record(
                    InventoryMovement.receipt(
                            actor,
                            receiptId,
                            line
                    )
            );
        }
    }

    public InventoryTransaction adjustManually(
            Long actor,
            Long variantId,
            int quantityDelta,
            String reason
    ) {
        requireTrackedVariant(variantId);

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
                InventoryMovement.manualAdjustment(
                        actor,
                        variantId,
                        quantityDelta,
                        reason
                )
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
                    InventoryMovement.confirmedOrder(
                            actor,
                            orderId,
                            line,
                            reason
                    )
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
                    InventoryMovement.orderRestoration(
                            actor,
                            orderId,
                            line,
                            transactionType,
                            reason
                    )
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
            InventoryMovement movement
    ) {
        InventoryTransaction transaction = new InventoryTransaction();
        transaction.setVariantId(movement.variantId());
        transaction.setQuantityDelta(movement.quantityDelta());
        transaction.setTransactionType(movement.transactionType());
        transaction.setOrderId(movement.orderId());
        transaction.setGoodsReceiptId(movement.receiptId());
        transaction.setActorAccountId(movement.actor());
        transaction.setReason(normalize(movement.reason()));

        return transactions.save(transaction);
    }

    public void requireTrackedVariant(Long variantId) {
        if (inventories.findById(variantId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    public void initializeVariant(Long variantId) {
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

    private record InventoryMovement(
            Long actor,
            Long variantId,
            int quantityDelta,
            String transactionType,
            Long orderId,
            Long receiptId,
            String reason
    ) {

        private static InventoryMovement receipt(
                Long actor,
                Long receiptId,
                StockLine line
        ) {
            return new InventoryMovement(
                    actor,
                    line.variantId(),
                    line.quantity(),
                    InventoryPolicy.RECEIPT_IN,
                    null,
                    receiptId,
                    null
            );
        }

        private static InventoryMovement manualAdjustment(
                Long actor,
                Long variantId,
                int quantityDelta,
                String reason
        ) {
            return new InventoryMovement(
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

        private static InventoryMovement confirmedOrder(
                Long actor,
                Long orderId,
                StockLine line,
                String reason
        ) {
            return new InventoryMovement(
                    actor,
                    line.variantId(),
                    -line.quantity(),
                    InventoryPolicy.ORDER_CONFIRM_OUT,
                    orderId,
                    null,
                    reason
            );
        }

        private static InventoryMovement orderRestoration(
                Long actor,
                Long orderId,
                StockLine line,
                String transactionType,
                String reason
        ) {
            return new InventoryMovement(
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

}
