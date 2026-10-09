package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.cart.service.CartCommandService;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.dto.response.OrderConfirmationDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.mapper.OrderMapper;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderCreationService {

    private final CheckoutCalculationService checkout;
    private final CartCommandService cart;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final AuditService audit;
    private final CheckoutQuoteStore quotes;
    private final com.fido.modules.promotion.service.VoucherRedemptionService vouchers;

    public OrderCreationService(
            CheckoutCalculationService checkout,
            CartCommandService cart,
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            AuditService audit,
            CheckoutQuoteStore quotes,
            com.fido.modules.promotion.service.VoucherRedemptionService vouchers
    ) {
        this.checkout = checkout;
        this.cart = cart;
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.audit = audit;
        this.quotes = quotes;
        this.vouchers = vouchers;
    }

    public OrderConfirmationDto create(
            Long accountId,
            CreateOrderRequest request
    ) {
        cart.lockForCheckout(accountId);
        var quote = quotes.find(accountId, request.quote_id());
        if (quote != null && quote.getOrderId() != null) {
            return OrderMapper.confirmation(orders.findById(quote.getOrderId()).orElseThrow(),
                    payments.findById(quote.getOrderId()).orElseThrow());
        }
        CheckoutCalculation calculation = checkout.calculate(
                accountId,
                request.voucher_code()
        );

        quotes.requireMatching(quote, request.recipient_phone(), request.recipient_email(), request.recipient_address(), calculation);

        Order order = persistOrder(
                accountId,
                request,
                calculation
        );

        persistOrderItems(
                order.getOrderId(),
                calculation.items()
        );

        Payment payment = persistInitialPayment(
                order.getOrderId(),
                calculation.total()
        );

        vouchers.consume(order.getOrderId(), accountId, calculation.voucher());
        if (quote != null) quote.setOrderId(order.getOrderId());
        cart.clear(accountId);

        audit.record(
                AuditEvent.of(
                        accountId,
                        AuditAction.ORDER_CREATE,
                        AuditTargetType.ORDER,
                        order.getOrderId()
                )
        );

        return OrderMapper.confirmation(
                order,
                payment
        );
    }

    private Order persistOrder(
            Long accountId,
            CreateOrderRequest request,
            CheckoutCalculation calculation
    ) {
        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerAccountId(accountId);
        order.setRecipientPhone(request.recipient_phone());
        order.setRecipientEmail(request.recipient_email());
        order.setRecipientAddress(request.recipient_address());
        order.setSubtotalSnapshot(calculation.subtotal());
        order.setDiscountSnapshot(calculation.discount());
        order.setShippingFeeSnapshot(calculation.shippingFee());
        order.setTotalSnapshot(calculation.total());
        order.setVoucherId(calculation.voucher().voucherId());
        order.setOrderStatus(OrderPolicy.PENDING);

        return orders.save(order);
    }

    private void persistOrderItems(
            Long orderId,
            List<CheckoutCartView.Item> cartItems
    ) {
        for (CheckoutCartView.Item cartItem : cartItems) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrderId(orderId);
            orderItem.setVariantId(cartItem.variantId());
            orderItem.setProductNameSnapshot(cartItem.productName());
            orderItem.setImageUrlSnapshot(cartItem.thumbnail());
            orderItem.setSkuSnapshot(cartItem.sku());
            orderItem.setSizeSnapshot(cartItem.size());
            orderItem.setColorSnapshot(cartItem.color());
            orderItem.setUnitPriceSnapshot(cartItem.unitPrice());
            orderItem.setQuantity(cartItem.quantity());
            orderItem.setLineTotalSnapshot(cartItem.lineTotal());

            items.save(orderItem);
        }
    }

    private Payment persistInitialPayment(
            Long orderId,
            BigDecimal total
    ) {
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setPaymentStatus(OrderPolicy.UNPAID);
        payment.setAmountDue(total);
        payment.setAmountReceived(BigDecimal.ZERO);
        payment.setAmountRefunded(BigDecimal.ZERO);

        return payments.save(payment);
    }

    private String generateOrderCode() {
        return "ORD-"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .toUpperCase(Locale.ROOT);
    }
}
