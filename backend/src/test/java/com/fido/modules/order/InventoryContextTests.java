package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.modules.inventory.entity.Inventory;
import com.fido.modules.inventory.service.InventoryCommandService;
import com.fido.modules.order.entity.Order;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;

class InventoryContextTests extends OrderHttpSupport {
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired InventoryCommandService inventory;

    @Test
    void bulkStockUpdateKeepsCallerManagedAndRefreshesAlreadyLoadedInventory() throws Exception {
        var customer = user();
        var variant = createVariant(5, 100000, null);
        long orderId = createOrder(customer, variant, 1);
        Long orderItemId = db.queryForObject(
                "SELECT id FROM order_items WHERE order_id=? AND product_id=?",
                Long.class, orderId, variant.productId());

        var previousContext = SecurityContextHolder.getContext();
        SecurityContextHolder.setContext(authenticatedContext(customer.accountId()));
        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                Order order = em.find(Order.class, orderId);
                Inventory stock = em.find(
                        Inventory.class,
                        new Inventory.InventoryId(variant.warehouseId(), variant.productId()));
                inventory.deductConfirmedOrder(
                        customer.accountId(),
                        orderId,
                        List.of(new InventoryCommandService.StockLine(
                                variant.productId(), 1, orderItemId)),
                        "ORDER_CONFIRM");
                assertTrue(em.contains(order));
                assertTrue(em.contains(stock));
                assertEquals(4, stock.getQuantityOnHand());
                order.setSubtotal(90_000L);
            });
        } finally {
            SecurityContextHolder.clearContext();
            SecurityContextHolder.setContext(previousContext);
        }

        assertEquals(90_000L,
                db.queryForObject("SELECT subtotal FROM orders WHERE id=?", Long.class, orderId));
        assertEquals(4, stock(variant.productId()));
        assertEquals(1, movementCount(orderId, "ORDER"));
    }

    @Test
    void failureOnLaterStockLineRollsBackEarlierMutationAndLedger() throws Exception {
        var customer = user();
        var first = createVariant(5, 100000, null);
        var second = createVariant(1, 100000, null);
        call("POST", "/api/v1/cart/items", customer.token(),
                Map.of("product_id", second.productId(), "quantity", 2));
        long orderId = createOrder(customer, first, 1);
        Long firstOrderItemId = db.queryForObject(
                "SELECT id FROM order_items WHERE order_id=? AND product_id=?",
                Long.class, orderId, first.productId());
        Long secondOrderItemId = db.queryForObject(
                "SELECT id FROM order_items WHERE order_id=? AND product_id=?",
                Long.class, orderId, second.productId());

        var previousContext = SecurityContextHolder.getContext();
        SecurityContextHolder.setContext(authenticatedContext(customer.accountId()));
        try {
            assertThrows(
                    org.springframework.web.server.ResponseStatusException.class,
                    () -> new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                            inventory.deductConfirmedOrder(
                                    customer.accountId(),
                                    orderId,
                                    List.of(
                                            new InventoryCommandService.StockLine(
                                                    second.productId(), 2, secondOrderItemId),
                                            new InventoryCommandService.StockLine(
                                                    first.productId(), 1, firstOrderItemId)),
                                    "ORDER_CONFIRM")));
        } finally {
            SecurityContextHolder.clearContext();
            SecurityContextHolder.setContext(previousContext);
        }

        assertEquals(5, stock(first.productId()));
        assertEquals(1, stock(second.productId()));
        assertEquals(0, movementCount(orderId, "ORDER"));
    }

    private SecurityContext authenticatedContext(long accountId) {
        Jwt jwt = Jwt.withTokenValue("inventory-context-test")
                .header("alg", "none")
                .subject(Long.toString(accountId))
                .build();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        return context;
    }
}
