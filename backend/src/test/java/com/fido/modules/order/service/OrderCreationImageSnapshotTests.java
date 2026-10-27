package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.account.service.AccountMutationLockService;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.cart.service.CartCommandService;
import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderAddress;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.repository.OrderAddressRepository;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.OrderVoucherSnapshotRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.product.service.OrderProductSnapshotService;
import com.fido.modules.promotion.service.VoucherRedemptionService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

class OrderCreationImageSnapshotTests {
    @Test
    void createCopiesCurrentCoverIntoImmutableOrderItemSnapshot() {
        CheckoutCalculationService checkout = mock(CheckoutCalculationService.class);
        CartCommandService cart = mock(CartCommandService.class);
        AccountMutationLockService accountLocks = mock(AccountMutationLockService.class);
        OrderRepository orders = mock(OrderRepository.class);
        OrderItemRepository items = mock(OrderItemRepository.class);
        OrderAddressRepository addresses = mock(OrderAddressRepository.class);
        OrderVoucherSnapshotRepository voucherSnapshots = mock(OrderVoucherSnapshotRepository.class);
        PaymentRepository payments = mock(PaymentRepository.class);
        ShippingInfoRepository shippingInfos = mock(ShippingInfoRepository.class);
        AuditWriteService audit = mock(AuditWriteService.class);
        VoucherRedemptionService vouchers = mock(VoucherRedemptionService.class);
        CheckoutRequestNormalizer normalizer = mock(CheckoutRequestNormalizer.class);
        OrderProductSnapshotService productSnapshots = mock(OrderProductSnapshotService.class);

        OrderCreationService service = new OrderCreationService(
                checkout, cart, accountLocks, orders, items, addresses, voucherSnapshots,
                payments, shippingInfos, audit, vouchers, normalizer, productSnapshots);

        String currentCover = "https://cdn.test/current-cover.jpg";
        CheckoutCartView.Item checkoutItem = new CheckoutCartView.Item(
                91L, 2, "FIDO Shirt", currentCover, "SKU-91", 90_000L, 180_000L, 10, true);
        PricingCalculator.PricedLine pricedLine =
                new PricingCalculator.PricedLine(91L, 90_000L, 2, 180_000L, 0L, 180_000L);
        CheckoutCalculation calculation = new CheckoutCalculation(
                List.of(checkoutItem), 180_000L, 0L, 30_000L, 210_000L,
                new VoucherRedemptionService.Discount(null, null, 0L), List.of(pricedLine));
        CheckoutRequestNormalizer.Normalized normalized = new CheckoutRequestNormalizer.Normalized(
                "Receiver", "0900000000", "Hanoi", "District", "Ward", "Address line", null);
        CreateOrderRequest request = new CreateOrderRequest(
                "Receiver", "0900000000", "Hanoi", "District", "Ward", "Address line", null);

        when(normalizer.normalize("Receiver", "0900000000", "Hanoi", "District", "Ward",
                "Address line", null)).thenReturn(normalized);
        when(normalizer.fingerprint(normalized)).thenReturn("request-fingerprint");
        when(orders.findByIdempotencyKeyAndCustomerAccountId(anyString(), eq(42L)))
                .thenReturn(Optional.empty());
        when(checkout.calculateForOrder(42L, null)).thenReturn(calculation);
        when(productSnapshots.attributeSnapshots(any(Set.class))).thenReturn(Map.of(91L, "[]"));
        when(orders.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setOrderId(100L);
            return order;
        });
        when(addresses.save(any(OrderAddress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(payments.save(any(com.fido.modules.order.entity.Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.createWithIdempotencyKey(42L, request, List.of("order-key-1"));

        ArgumentCaptor<OrderItem> saved = ArgumentCaptor.forClass(OrderItem.class);
        verify(items).save(saved.capture());
        assertEquals(currentCover, saved.getValue().getImageUrlSnapshot());
        assertEquals(91L, saved.getValue().getProductId());
        assertEquals(2, saved.getValue().getQuantity());
        assertEquals(90_000L, saved.getValue().getUnitPrice());
        assertEquals(180_000L, saved.getValue().getLineTotal());
    }
}
