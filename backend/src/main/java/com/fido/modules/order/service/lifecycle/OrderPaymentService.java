package com.fido.modules.order.service.lifecycle;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.order.dto.request.PaymentActionRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.service.OrderPolicy;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@Service
@Transactional
public class OrderPaymentService {
    private static final String PAYMENT =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_PAYMENT')";

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final OrderQueryService query;
    private final AuditWriteService audit;

    public OrderPaymentService(
            OrderRepository orders,
            PaymentRepository payments,
            OrderQueryService query,
            AuditWriteService audit) {
        this.orders = orders;
        this.payments = payments;
        this.query = query;
        this.audit = audit;
    }

    /**
     * actor là người thao tác từ JWT; orderId từ URL, request chỉ cho phép hoàn tất giao hàng kèm thu
     * COD.
     * Order và Payment phải đổi cùng giao dịch để không có đơn hoàn tất nhưng tiền chưa thu.
     */
    @PreAuthorize(PAYMENT)
    public OrderAdminDetailDto action(
            Long actor, Long orderId, PaymentActionRequest request, Authentication authentication) {
        if (request == null || !"COMPLETE_DELIVERY_AND_COLLECT_COD".equals(request.action())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "ORDER_PAYMENT_ACTION_INVALID");
        }

        Order order =
                orders.findByIdForUpdate(orderId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment =
                payments.findByOrderIdForUpdate(orderId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.CONFLICT, "ORDER_PAYMENT_MISSING"));

        payment.requireCollectible();
        // Eligibility across Order and Payment stays in the application service.
        if (actor == null
                || actor <= 0
                || !OrderPolicy.SHIPPING.equals(order.getOrderStatus())
                || !payment.getAmount().equals(order.getTotalAmount())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "ORDER_COD_COLLECTION_NOT_ALLOWED");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
        String beforeOrderStatus = order.getOrderStatus();
        String beforePaymentStatus = payment.getPaymentStatus();
        long collectionAmount = payment.getAmount();

        order.complete();
        payment.collectCod(actor, now);

        orders.save(order);
        payments.save(payment);

        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ORDER_COMPLETE,
                        AuditEntityType.ORDER,
                        orderId.toString(),
                        Map.of(
                                "status", beforeOrderStatus,
                                "payment_status", beforePaymentStatus),
                        Map.of(
                                "status",
                                order.getOrderStatus(),
                                "payment_status",
                                payment.getPaymentStatus(),
                                "total_amount",
                                collectionAmount)));
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ORDER_COD_COLLECT,
                        AuditEntityType.PAYMENT,
                        orderId.toString(),
                        Map.of("payment_status", beforePaymentStatus),
                        Map.of(
                                "payment_status",
                                payment.getPaymentStatus(),
                                "total_amount",
                                collectionAmount)));

        return query.adminDetailInternal(order, authentication);
    }
}
