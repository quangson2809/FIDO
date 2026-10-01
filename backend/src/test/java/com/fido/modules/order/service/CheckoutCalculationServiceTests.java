package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.fido.modules.cart.service.CartQueryService;
import com.fido.modules.cart.service.CheckoutCartView;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class CheckoutCalculationServiceTests {

    @Mock
    private CartQueryService cart;

    private CheckoutCalculationService service;

    @BeforeEach
    void setUp() {
        service = new CheckoutCalculationService(
                cart,
                new BigDecimal("30000.00")
        );
    }

    @Test
    void calculatesValidatedCheckoutTotalsFromCurrentCart() {
        when(cart.checkoutView(10L))
                .thenReturn(
                        new CheckoutCartView(
                                1L,
                                List.of(
                                        item(
                                                100L,
                                                2,
                                                new BigDecimal("80000.00"),
                                                5,
                                                true
                                        )
                                ),
                                new BigDecimal("160000.00")
                        )
                );

        CheckoutCalculation result = service.calculate(
                10L,
                null
        );

        assertEquals(
                new BigDecimal("160000.00"),
                result.subtotal()
        );
        assertEquals(
                BigDecimal.ZERO,
                result.discount()
        );
        assertEquals(
                new BigDecimal("30000.00"),
                result.shippingFee()
        );
        assertEquals(
                new BigDecimal("190000.00"),
                result.total()
        );
        assertEquals(
                1,
                result.items().size()
        );
    }

    @Test
    void rejectsVoucherUntilVoucherRulesAreImplemented() {
        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.calculate(10L, "PROMO")
        );

        assertEquals(
                HttpStatus.NOT_IMPLEMENTED,
                error.getStatusCode()
        );
    }

    @Test
    void rejectsEmptyCart() {
        when(cart.checkoutView(10L))
                .thenReturn(
                        new CheckoutCartView(
                                null,
                                List.of(),
                                BigDecimal.ZERO
                        )
                );

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.calculate(10L, null)
        );

        assertEquals(
                HttpStatus.CONFLICT,
                error.getStatusCode()
        );
    }

    @Test
    void rejectsUnavailableOrInsufficientStockItem() {
        when(cart.checkoutView(10L))
                .thenReturn(
                        new CheckoutCartView(
                                1L,
                                List.of(
                                        item(
                                                100L,
                                                2,
                                                new BigDecimal("80000.00"),
                                                1,
                                                true
                                        )
                                ),
                                new BigDecimal("160000.00")
                        )
                );

        ResponseStatusException error = assertThrows(
                ResponseStatusException.class,
                () -> service.calculate(10L, null)
        );

        assertEquals(
                HttpStatus.CONFLICT,
                error.getStatusCode()
        );
    }

    private CheckoutCartView.Item item(
            Long variantId,
            int quantity,
            BigDecimal unitPrice,
            int availableQuantity,
            boolean purchasable
    ) {
        return new CheckoutCartView.Item(
                variantId,
                quantity,
                "Product",
                "SKU",
                "M",
                "Black",
                unitPrice,
                unitPrice.multiply(BigDecimal.valueOf(quantity)),
                availableQuantity,
                purchasable
        );
    }
}
