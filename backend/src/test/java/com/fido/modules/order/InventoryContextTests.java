package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;
import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.entity.Order;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class InventoryContextTests extends OrderHttpSupport {
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired InventoryCommandService inventory;

    @Test
    void bulkStockUpdateKeepsCallerManagedAndRefreshesAlreadyLoadedInventory() throws Exception {
        var customer = user();
        var variant = createVariant(5, 100000, null);
        long orderId = createOrder(customer, variant, 1);
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            Order order = em.find(Order.class, orderId);
            Inventory stock = em.find(Inventory.class, variant.variantId());
            inventory.deductConfirmedOrder(customer.accountId(), orderId,
                    List.of(new InventoryCommandService.StockLine(variant.variantId(), 1)), "context test");
            assertTrue(em.contains(order));
            assertTrue(em.contains(stock));
            assertEquals(4, stock.getAvailableQuantity());
            // No save/merge: this mutation would be lost if inventory cleared the context.
            order.setCustomerServiceNote("managed after stock mutation");
        });
        assertEquals("managed after stock mutation", db.queryForObject("SELECT customer_service_note FROM orders WHERE order_id=?", String.class, orderId));
        assertEquals(4, stock(variant.variantId()));
        assertEquals(1, movementCount(orderId, "ORDER_CONFIRM_OUT"));
    }

    @Test
    void failureOnLaterStockLineRollsBackEarlierMutationAndLedger() throws Exception {
        var customer = user();
        var first = createVariant(5, 100000, null);
        var second = createVariant(1, 100000, null);
        long orderId = createOrder(customer, first, 1);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
                new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                        inventory.deductConfirmedOrder(customer.accountId(), orderId,
                                List.of(new InventoryCommandService.StockLine(second.variantId(), 2),
                                        new InventoryCommandService.StockLine(first.variantId(), 1)), "rollback test")));
        assertEquals(5, stock(first.variantId()));
        assertEquals(1, stock(second.variantId()));
        assertEquals(0, movementCount(orderId, "ORDER_CONFIRM_OUT"));
    }
}
