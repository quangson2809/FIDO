package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.cart.service.CartService;
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
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrderCreationService {

    private final CartService cart;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final AuditService audit;
    private final BigDecimal shippingFee;

    public OrderCreationService(
            CartService cart,
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            AuditService audit,
            @Value("${app.checkout.shipping-fee:30000.00}")
                    BigDecimal shippingFee
    ) {
        if (shippingFee.signum() < 0) {
            throw new IllegalArgumentException(
                    "Checkout shipping fee cannot be negative"
            );
        }

        this.cart = cart;
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.audit = audit;
        this.shippingFee = shippingFee;
    }

    public OrderConfirmationDto create(
            Long accountId,
            CreateOrderRequest request
    ) {
        if (request.voucher_code() != null
                && !request.voucher_code().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_IMPLEMENTED
            );
        }

        var current = cart.checkoutView(accountId);

        if (current.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        current.items().forEach(item -> {
            boolean enoughInventory =
                    item.availableQuantity() != null
                    && item.availableQuantity() >= item.quantity();

            if (!item.purchasable() || !enoughInventory) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT
                );
            }
        });

        BigDecimal subtotal = current.subtotal();
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal total = subtotal
                .subtract(discount)
                .add(shippingFee);

        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerAccountId(accountId);
        order.setRecipientPhone(request.recipient_phone());
        order.setRecipientEmail(request.recipient_email());
        order.setRecipientAddress(request.recipient_address());
        order.setSubtotalSnapshot(subtotal);
        order.setDiscountSnapshot(discount);
        order.setShippingFeeSnapshot(shippingFee);
        order.setTotalSnapshot(total);
        order.setVoucherId(null);
        order.setOrderStatus(OrderPolicy.PENDING);

        orders.save(order);

        for (var cartItem : current.items()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrderId(order.getOrderId());
            orderItem.setVariantId(cartItem.variantId());
            orderItem.setProductNameSnapshot(cartItem.productName());
            orderItem.setSkuSnapshot(cartItem.sku());
            orderItem.setSizeSnapshot(cartItem.size());
            orderItem.setColorSnapshot(cartItem.color());
            orderItem.setUnitPriceSnapshot(cartItem.unitPrice());
            orderItem.setQuantity(cartItem.quantity());
            orderItem.setLineTotalSnapshot(cartItem.lineTotal());

            items.save(orderItem);
        }

        Payment payment = new Payment();
        payment.setOrderId(order.getOrderId());
        payment.setPaymentStatus(OrderPolicy.UNPAID);
        payment.setAmountDue(total);
        payment.setAmountReceived(BigDecimal.ZERO);
        payment.setAmountRefunded(BigDecimal.ZERO);

        payments.save(payment);

        audit.record(
                accountId,
                "ORDER_CREATE",
                "ORDER",
                order.getOrderId()
        );

        return OrderMapper.confirmation(
                order,
                payment
        );
    }

    private String generateOrderCode() {
        return "ORD-"
                + UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .toUpperCase(Locale.ROOT);
    }
}
