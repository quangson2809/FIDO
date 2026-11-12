package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.InventoryTransaction;
import com.fido.modules.product.service.InventoryProductAccessService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryCommandService {
    private final InventoryReceiptWorkflow receipts;
    private final InventoryOpeningWorkflow opening;
    private final InventoryAdjustmentWorkflow adjustments;
    private final InventoryOrderWorkflow orders;
    private final InventoryProductAccessService productAccess;

    public InventoryCommandService(
            InventoryReceiptWorkflow receipts,
            InventoryOpeningWorkflow opening,
            InventoryAdjustmentWorkflow adjustments,
            InventoryOrderWorkflow orders,
            InventoryProductAccessService productAccess) {
        this.receipts = receipts;
        this.opening = opening;
        this.adjustments = adjustments;
        this.orders = orders;
        this.productAccess = productAccess;
    }

    public void receiveGoods(Long actor, Long receiptId, Long warehouseId, List<StockLine> lines) {
        receipts.receiveGoods(actor, receiptId, warehouseId, lines);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')")
    public InventoryTransaction openStock(Long actor, Long productId, int openingQuantity) {
        return opening.openStock(actor, productId, openingQuantity);
    }

    public InventoryTransaction adjustManually(
            Long actor,
            Long productId,
            int quantityDelta,
            String reasonCode,
            String sourceOperationId,
            Integer expectedVersion) {
        return adjustments.adjustManually(
                actor, productId, quantityDelta, reasonCode, sourceOperationId, expectedVersion);
    }

    public InventoryTransaction reverseAdjustment(
            Long actor, Long sourceTransactionId, String reasonCode, Integer expectedVersion) {
        return adjustments.reverseAdjustment(
                actor, sourceTransactionId, reasonCode, expectedVersion);
    }

    public void deductConfirmedOrder(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        orders.deductConfirmedOrder(actor, orderId, lines, reason);
    }

    public void requireConfirmedOrderMovements(Long orderId, List<StockLine> lines) {
        orders.requireConfirmedOrderMovements(orderId, lines);
    }

    public void restoreCancelledOrder(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        orders.restoreCancelledOrder(actor, orderId, lines, reason);
    }

    public void restoreDeliveryReturn(
            Long actor, Long orderId, List<StockLine> lines, String reason) {
        orders.restoreDeliveryReturn(actor, orderId, lines, reason);
    }

    public void requireTrackedProduct(Long productId) {
        productAccess.requireTrackedProduct(productId);
    }

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
                throw new IllegalArgumentException(
                        "Stock line requires Product ID and positive quantity");
            }
        }
    }
}
