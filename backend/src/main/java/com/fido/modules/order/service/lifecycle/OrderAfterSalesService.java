package com.fido.modules.order.service.lifecycle;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.order.dto.request.AfterSalesRequest;
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
public class OrderAfterSalesService {
    private static final String AFTER_SALES_AND_PAYMENT =
            "hasAnyAuthority('ROLE_SUPERADMIN') or "
                    + "(hasAuthority('PERMISSION_ORDER_AFTER_SALES') "
                    + "and hasAuthority('PERMISSION_ORDER_PAYMENT'))";

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final OrderQueryService query;
    private final AuditWriteService audit;

    public OrderAfterSalesService(
            OrderRepository orders,
            PaymentRepository payments,
            OrderQueryService query,
            AuditWriteService audit) {
        this.orders = orders;
        this.payments = payments;
        this.query = query;
        this.audit = audit;
    }

    @PreAuthorize(AFTER_SALES_AND_PAYMENT)
    public OrderAdminDetailDto process(
            Long actor, Long orderId, AfterSalesRequest request, Authentication authentication) {
        if (request == null || !"RETURN_AND_REFUND_FULL".equals(request.action())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "ORDER_AFTER_SALES_ACTION_INVALID");
        }
        return returnAndRefundFull(actor, orderId, request.reason(), authentication);
    }

    /**
     * actor từ JWT, orderId từ URL; reason là lý do nhân viên gửi khi nhận trả và hoàn toàn bộ COD.
     * Thao tác chỉ ghi nhận hoàn tiền/trả đơn, không chứng minh hàng còn bán được để tự nhập kho.
     */
    private OrderAdminDetailDto returnAndRefundFull(
            Long actor, Long orderId, String reason, Authentication authentication) {
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

        payment.requireRefundable();
        if (!OrderPolicy.COMPLETED.equals(order.getOrderStatus())
                || !payment.getAmount().equals(order.getTotalAmount())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_AFTER_SALES_NOT_ALLOWED");
        }
        if (actor == null || actor <= 0 || reason == null || reason.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "ORDER_REFUND_REASON_REQUIRED");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
        OrderPolicy.requireReturnWithinWindow(payment.getCollectedAt(), now);
        String fromOrder = order.getOrderStatus();
        String fromPayment = payment.getPaymentStatus();
        long fullRefundAmount = payment.getAmount();

        order.acceptReturn();
        orders.save(order);

        payment.refundFull(actor, reason, now);
        payments.save(payment);

        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ORDER_RETURN_ACCEPT,
                        AuditEntityType.ORDER,
                        orderId.toString(),
                        Map.of(
                                "status", fromOrder,
                                "payment_status", fromPayment),
                        Map.of(
                                "status", order.getOrderStatus(),
                                "payment_status", payment.getPaymentStatus())));
        audit.record(
                AuditWriteEvent.withChanges(
                        AuditAction.ORDER_REFUND,
                        AuditEntityType.PAYMENT,
                        orderId.toString(),
                        Map.of("payment_status", fromPayment),
                        Map.of(
                                "payment_status",
                                payment.getPaymentStatus(),
                                "refund_amount",
                                fullRefundAmount)));

        return query.adminDetailInternal(order, authentication);
    }
}
