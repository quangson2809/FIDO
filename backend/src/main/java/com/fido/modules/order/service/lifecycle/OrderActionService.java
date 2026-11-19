package com.fido.modules.order.service.lifecycle;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.dto.response.OrderCustomerDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class OrderActionService {
    private final OrderActionPolicy policy;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final OrderQueryService query;
    private final AuditWriteService audit;
    private final Map<OrderAction, OrderActionHandler> handlers;

    public OrderActionService(
            OrderActionPolicy policy,
            OrderRepository orders,
            PaymentRepository payments,
            OrderQueryService query,
            AuditWriteService audit,
            List<OrderActionHandler> handlers) {
        this.policy = policy;
        this.orders = orders;
        this.payments = payments;
        this.query = query;
        this.audit = audit;
        // Spring cấp các handler; mỗi action phải ánh xạ đúng một handler để lỗi thiếu/trùng bị
        // phát hiện lúc khởi động.
        var registry = new EnumMap<OrderAction, OrderActionHandler>(OrderAction.class);
        for (var handler : handlers)
            for (var action : handler.supportedActions()) {
                if (registry.putIfAbsent(action, handler) != null)
                    throw new IllegalStateException("Duplicate Order action handler: " + action);
            }
        if (!registry.keySet().equals(EnumSet.allOf(OrderAction.class)))
            throw new IllegalStateException("Every Order action requires a handler");
        this.handlers = Map.copyOf(registry);
    }

    /**
     * actor lấy từ JWT, orderId từ URL, request chứa lệnh quản trị; authentication dùng lọc quyền
     * trong phản hồi.
     * Khóa và đọc lại đơn trước khi kiểm tra điều kiện, chạy handler và ghi audit cùng giao dịch.
     */
    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_EDIT')")
    public OrderAdminDetailDto executeAction(
            Long actor, Long orderId, OrderActionRequest request, Authentication authentication) {
        Order order =
                orders.findByIdForUpdate(orderId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment = payment(orderId);

        policy.requireExecutable(order, payment, request.action());
        applyAction(actor, order, payment, request);
        return query.adminDetailInternal(order, authentication);
    }

    @PreAuthorize("isAuthenticated()")
    public OrderCustomerDetailDto cancelOwnOrder(Long accountId, Long orderId) {
        Order order =
                orders.findCustomerOrderForUpdate(orderId, accountId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        Payment payment = payment(orderId);
        policy.requireCustomerCancellation(order, payment);
        applyAction(
                accountId, order, payment, new OrderActionRequest(OrderAction.CANCEL.name(), null));
        return query.customerDetailInternal(order);
    }

    private Payment payment(Long orderId) {
        return payments.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("ORDER_PAYMENT_MISSING"));
    }

    private void applyAction(Long actor, Order order, Payment payment, OrderActionRequest request) {
        OrderAction orderAction = OrderAction.require(request.action());
        // Giữ trạng thái trước xử lý vì handler sẽ sửa trực tiếp entity; audit cần cả trước và sau.
        String fromOrderStatus = order.getOrderStatus();
        handlers.get(orderAction).execute(actor, order, request);
        auditTransition(
                orderAction.auditAction(),
                order,
                fromOrderStatus,
                order.getOrderStatus(),
                orderAction == OrderAction.CANCEL ? payment.getPaymentStatus() : null);
    }

    private void auditTransition(
            AuditAction action,
            Order order,
            String fromOrderStatus,
            String toOrderStatus,
            String paymentStatus) {
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("status", fromOrderStatus);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", toOrderStatus);
        if (paymentStatus != null) {
            before.put("payment_status", paymentStatus);
            after.put("payment_status", paymentStatus);
        }
        audit.record(
                AuditWriteEvent.withChanges(
                        action,
                        AuditEntityType.ORDER,
                        order.getOrderId().toString(),
                        before,
                        after));
    }
}
