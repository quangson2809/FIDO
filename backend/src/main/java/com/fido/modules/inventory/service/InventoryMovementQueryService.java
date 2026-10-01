package com.fido.modules.inventory.service;

import com.fido.modules.inventory.repository.InventoryTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class InventoryMovementQueryService {
    private final InventoryTransactionRepository transactions;

    public InventoryMovementQueryService(InventoryTransactionRepository transactions) {
        this.transactions = transactions;
    }

    public OrderStockState orderStockState(Long orderId) {
        return new OrderStockState(
                hasMovement(orderId, InventoryPolicy.ORDER_CONFIRM_OUT),
                hasMovement(orderId, InventoryPolicy.ORDER_CANCEL_IN),
                hasMovement(orderId, InventoryPolicy.DELIVERY_RETURN_IN)
        );
    }

    private boolean hasMovement(Long orderId, String transactionType) {
        return transactions.existsByOrderIdAndTransactionType(orderId, transactionType);
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
