package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.order.dto.request.PaymentActionRequest;
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
public class OrderPaymentService {
    private static final String PAYMENT =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_PAYMENT')";

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shippingInfos;
    private final OrderQueryService query;
    private final AuditWriteService audit;

    public OrderPaymentService(
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

    @PreAuthorize(PAYMENT)
    public OrderAdminDetailDto action(
            Long actor, Long orderId, PaymentActionRequest request, Authentication authentication) {
        if (request == null
                || !"COMPLETE_DELIVERY_AND_COLLECT_COD".equals(request.action())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_PAYMENT_ACTION_INVALID");
        }

        Order order = orders.findByIdForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment = payments.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_PAYMENT_MISSING"));
        ShippingInfo shipping = shippingInfos.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_SHIPPING_INFO_MISSING"));

        if (OrderPolicy.REFUNDED.equals(payment.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_REFUNDED");
        }
        if (OrderPolicy.PAID.equals(payment.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_COLLECTED");
        }
        if (actor == null || actor <= 0
                || !OrderPolicy.SHIPPING.equals(order.getOrderStatus())
                || !OrderPolicy.UNPAID.equals(payment.getPaymentStatus())
                || !"SHIPPED".equals(shipping.getShippingStatus())
                || !"COD".equals(payment.getMethod())
                || payment.getAmount() == null
                || !payment.getAmount().equals(order.getTotalAmount())
                || !Objects.equals(payment.getCurrency(), order.getCurrency())
                || payment.getRefundAmount() == null
                || payment.getRefundAmount() != 0L
                || payment.getCollectedByAccountId() != null
                || payment.getCollectedAt() != null
                || payment.getRefundedByAccountId() != null
                || payment.getRefundedAt() != null
                || payment.getRefundReason() != null
                || shipping.getDeliveredAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_COD_COLLECTION_NOT_ALLOWED");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String beforeOrderStatus = order.getOrderStatus();
        String beforePaymentStatus = payment.getPaymentStatus();
        String beforeShippingStatus = shipping.getShippingStatus();
        long collectionAmount = payment.getAmount();

        order.setOrderStatus(OrderPolicy.COMPLETED);
        shipping.setShippingStatus("DELIVERED");
        shipping.setDeliveredAt(now);
        payment.setPaymentStatus(OrderPolicy.PAID);
        payment.setCollectedByAccountId(actor);
        payment.setCollectedAt(now);
        payment.setAmountReceived(collectionAmount);

        orders.save(order);
        shippingInfos.save(shipping);
        payments.save(payment);

        audit.record(AuditWriteEvent.withChanges(
                AuditAction.ORDER_COMPLETE,
                AuditEntityType.ORDER,
                orderId.toString(),
                Map.of(
                        "status", beforeOrderStatus,
                        "payment_status", beforePaymentStatus,
                        "shipping_status", beforeShippingStatus),
                Map.of(
                        "status", order.getOrderStatus(),
                        "payment_status", payment.getPaymentStatus(),
                        "shipping_status", shipping.getShippingStatus(),
                        "total_amount", collectionAmount)));
        audit.record(AuditWriteEvent.withChanges(
                AuditAction.ORDER_COD_COLLECT,
                AuditEntityType.PAYMENT,
                orderId.toString(),
                Map.of("payment_status", beforePaymentStatus),
                Map.of(
                        "payment_status", payment.getPaymentStatus(),
                        "total_amount", collectionAmount)));

        return query.adminDetailInternal(order, authentication);
    }
}
