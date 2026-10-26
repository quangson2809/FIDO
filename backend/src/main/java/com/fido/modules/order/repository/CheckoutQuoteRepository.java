package com.fido.modules.order.repository;

/**
 * Checkout quotes are short-lived runtime data. The canonical database schema intentionally
 * has no checkout_quotes table; persistence is handled by CheckoutQuoteStore.
 */
public final class CheckoutQuoteRepository {
    private CheckoutQuoteRepository() {}
}
