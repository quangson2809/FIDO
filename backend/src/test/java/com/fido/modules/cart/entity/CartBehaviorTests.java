package com.fido.modules.cart.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;

class CartBehaviorTests {
    @Test
    void invalidQuantityAndOverflowKeepThePreviousPurchaseIntent() {
        CartItem item = new CartItem();
        item.changeQuantity(2);
        item.increaseQuantity(3);
        assertEquals(5, item.getQuantity());
        assertThrows(BusinessRuleException.class, () -> item.changeQuantity(0));
        assertThrows(BusinessRuleException.class, () -> item.changeQuantity(null));
        assertThrows(BusinessRuleException.class, () -> item.increaseQuantity(-1));
        assertEquals(5, item.getQuantity());
        item.changeQuantity(Integer.MAX_VALUE);
        assertThrows(BusinessRuleException.class, () -> item.increaseQuantity(1));
        assertEquals(Integer.MAX_VALUE, item.getQuantity());
    }

    @Test
    void completedCartCannotBeCompletedAgain() {
        Cart cart = new Cart();
        cart.complete();
        assertThrows(BusinessRuleException.class, cart::complete);
        assertEquals("COMPLETED", cart.getStatus());
    }
}
