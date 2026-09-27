package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.order.dto.request.PaymentActionRequest;
import com.fido.modules.order.dto.response.PaymentAdminDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.mapper.OrderMapper;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrderPaymentService {

    private static final String PAYMENT =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_PAYMENT')";

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final AuditService audit;

    public OrderPaymentService(
            OrderRepository orders,
            PaymentRepository payments,
            AuditService audit
    ) {
        this.orders = orders;
        this.payments = payments;
        this.audit = audit;
    }

    @PreAuthorize(PAYMENT)
    public PaymentAdminDto action(
            Long actor,
            Long orderId,
            PaymentActionRequest request
    ) {
        Order order = lockedOrder(orderId);
        Payment payment = payment(orderId);

        return switch (request.action()) {
            case "COLLECT_COD" ->
                    collect(actor, order, payment);
            case "REFUND" ->
                    refund(actor, order, payment);
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        };
    }

    private PaymentAdminDto collect(
            Long actor,
            Order order,
            Payment payment
    ) {
        if (OrderPolicy.PAID.equals(
                payment.getPaymentStatus()
        )) {
            return OrderMapper.paymentAdmin(payment);
        }

        if (!OrderPolicy.UNPAID.equals(
                payment.getPaymentStatus()
        )
                || OrderPolicy.CANCELLED.equals(
                        order.getOrderStatus()
                )
                || OrderPolicy.RETURNED.equals(
                        order.getOrderStatus()
                )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        payment.setPaymentStatus(OrderPolicy.PAID);
        payment.setAmountReceived(
                payment.getAmountDue()
        );
        payment.setCollectedByAccountId(actor);
        payment.setCollectedAt(now);

        payments.save(payment);

        audit.record(
                actor,
                "ORDER_COD_COLLECT",
                "ORDER",
                order.getOrderId()
        );

        return OrderMapper.paymentAdmin(payment);
    }

    private PaymentAdminDto refund(
            Long actor,
            Order order,
            Payment payment
    ) {
        if (OrderPolicy.REFUNDED.equals(
                payment.getPaymentStatus()
        )) {
            return OrderMapper.paymentAdmin(payment);
        }

        if (!OrderPolicy.PAID.equals(
                payment.getPaymentStatus()
        )
                || !OrderPolicy.RETURNED.equals(
                        order.getOrderStatus()
                )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        payment.setPaymentStatus(OrderPolicy.REFUNDED);
        payment.setAmountRefunded(
                payment.getAmountReceived()
        );
        payment.setRefundedByAccountId(actor);
        payment.setRefundedAt(now);

        payments.save(payment);

        audit.record(
                actor,
                "ORDER_REFUND",
                "ORDER",
                order.getOrderId()
        );

        return OrderMapper.paymentAdmin(payment);
    }

    private Order lockedOrder(Long orderId) {
        return orders.findByIdForUpdate(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Payment payment(Long orderId) {
        return payments.findById(orderId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Order payment is missing"
                        )
                );
    }
}
