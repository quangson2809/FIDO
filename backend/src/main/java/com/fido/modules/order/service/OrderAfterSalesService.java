package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.order.dto.request.AfterSalesRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional
public class OrderAfterSalesService {
    private static final String AFTER_SALES_AND_PAYMENT =
            "hasAnyAuthority('ROLE_SUPERADMIN') or "
                    + "(hasAuthority('PERMISSION_ORDER_AFTER_SALES') "
                    + "and hasAuthority('PERMISSION_ORDER_PAYMENT'))";

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shippingInfos;
    private final OrderQueryService query;
    private final AuditWriteService audit;

    public OrderAfterSalesService(
            OrderRepository orders,
            PaymentRepository payments,
            ShippingInfoRepository shippingInfos,
            OrderQueryService query,
            AuditWriteService audit) {
        this.orders = orders;
        this.payments = payments;
        this.shippingInfos = shippingInfos;
        this.query = query;
        this.audit = audit;
    }

    @PreAuthorize(AFTER_SALES_AND_PAYMENT)
    public OrderAdminDetailDto process(
            Long actor, Long orderId, AfterSalesRequest request, Authentication authentication) {
        if (request == null || !"RETURN_AND_REFUND_FULL".equals(request.action())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_AFTER_SALES_ACTION_INVALID");
        }
        return returnAndRefundFull(actor, orderId, request.reason(), authentication);
    }

    private OrderAdminDetailDto returnAndRefundFull(
            Long actor, Long orderId, String reason, Authentication authentication) {
        Order order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment = payments.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_PAYMENT_MISSING"));
        ShippingInfo shipping = shippingInfos.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_SHIPPING_INFO_MISSING"));

        if (OrderPolicy.REFUNDED.equals(payment.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_REFUNDED");
        }
        if (!OrderPolicy.canTransition(order.getOrderStatus(), OrderPolicy.RETURNED)
                || !OrderPolicy.COMPLETED.equals(order.getOrderStatus())
                || !OrderPolicy.PAID.equals(payment.getPaymentStatus())
                || !"DELIVERED".equals(shipping.getShippingStatus())
                || !"COD".equals(payment.getMethod())
                || payment.getAmount() == null
                || !payment.getAmount().equals(order.getTotalAmount())
                || !Objects.equals(payment.getCurrency(), order.getCurrency())
                || payment.getRefundAmount() == null
                || payment.getRefundAmount() != 0L
                || payment.getCollectedByAccountId() == null
                || payment.getCollectedAt() == null
                || payment.getRefundedByAccountId() != null
                || payment.getRefundedAt() != null
                || payment.getRefundReason() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_AFTER_SALES_NOT_ALLOWED");
        }
        if (actor == null || actor <= 0 || reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_REFUND_REASON_REQUIRED");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        OrderPolicy.requireReturnWithinWindow(shipping.getDeliveredAt(), now);
        String fromOrder = order.getOrderStatus();
        String fromPayment = payment.getPaymentStatus();
        String fromShipping = shipping.getShippingStatus();
        long fullRefundAmount = payment.getAmount();

        order.setOrderStatus(OrderPolicy.RETURNED);
        orders.save(order);

        payment.setPaymentStatus(OrderPolicy.REFUNDED);
        payment.setRefundAmount(fullRefundAmount);
        payment.setRefundedByAccountId(actor);
        payment.setRefundedAt(now);
        payment.setRefundReason(reason.trim());
        payments.save(payment);

        audit.record(AuditWriteEvent.withChanges(
                AuditAction.ORDER_RETURN_ACCEPT,
                AuditEntityType.ORDER,
                orderId.toString(),
                Map.of(
                        "status", fromOrder,
                        "payment_status", fromPayment,
                        "shipping_status", fromShipping),
                Map.of(
                        "status", order.getOrderStatus(),
                        "payment_status", payment.getPaymentStatus(),
                        "shipping_status", shipping.getShippingStatus())));
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.ORDER_REFUND,
                AuditEntityType.PAYMENT,
                orderId.toString(),
                Map.of("payment_status", fromPayment),
                Map.of(
                        "payment_status", payment.getPaymentStatus(),
                        "refund_amount", fullRefundAmount)));

        return query.adminDetailInternal(order, authentication);
    }
}
