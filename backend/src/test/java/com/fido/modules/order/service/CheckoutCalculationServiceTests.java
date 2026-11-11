package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.fido.modules.cart.service.CartQueryService;
import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.promotion.service.VoucherRedemptionService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@ExtendWith(MockitoExtension.class)
class CheckoutCalculationServiceTests {
    @Mock private CartQueryService cart;
    @Mock private VoucherRedemptionService vouchers;
    private CheckoutCalculationService service;

    @BeforeEach
    void setUp() {
        service = new CheckoutCalculationService(cart, vouchers, 30_000L, new PricingService());
    }

    @Test
    void calculatesValidatedCheckoutTotalsFromCurrentCart() {
        when(cart.checkoutView(10L)).thenReturn(new CheckoutCartView(
                1L, List.of(item(100L, 2, 80_000L, 5, true)), 160_000L));
        CheckoutCalculation result = service.calculateForOrder(10L, null);
        assertEquals(160_000L, result.subtotal());
        assertEquals(0L, result.discount());
        assertEquals(30_000L, result.shippingFee());
        assertEquals(190_000L, result.total());
        assertEquals(1, result.items().size());
    }

    @Test
    void rejectsEmptyCart() {
        when(cart.checkoutView(10L)).thenReturn(new CheckoutCartView(null, List.of(), 0L));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.calculateForOrder(10L, null));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    @Test
    void rejectsUnavailableOrInsufficientStockItem() {
        when(cart.checkoutView(10L)).thenReturn(new CheckoutCartView(
                1L, List.of(item(100L, 2, 80_000L, 1, true)), 160_000L));
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.calculateForOrder(10L, null));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    private CheckoutCartView.Item item(
            Long productId, int quantity, long unitPrice, int availableQuantity, boolean purchasable) {
        return new CheckoutCartView.Item(productId, quantity, "Product", null, "SKU", unitPrice,
                Math.multiplyExact(unitPrice, quantity), availableQuantity, purchasable);
    }
}
