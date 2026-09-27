package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditService;
import com.fido.modules.order.dto.request.AfterSalesRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.repository.OrderRepository;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrderAfterSalesService {

    private static final String AFTER_SALES =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_AFTER_SALES')";

    private final OrderRepository orders;
    private final OrderQueryService query;
    private final AuditService audit;

    public OrderAfterSalesService(
            OrderRepository orders,
            OrderQueryService query,
            AuditService audit
    ) {
        this.orders = orders;
        this.query = query;
        this.audit = audit;
    }

    @PreAuthorize(AFTER_SALES)
    public OrderAdminDetailDto process(
            Long actor,
            Long orderId,
            AfterSalesRequest request
    ) {
        return switch (request.operation()) {
            case "RETURN" ->
                    acceptReturn(actor, orderId, request.reason());
            case "EXCHANGE_SIZE" ->
                    throw new ResponseStatusException(
                            HttpStatus.NOT_IMPLEMENTED
                    );
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST
            );
        };
    }

    private OrderAdminDetailDto acceptReturn(
            Long actor,
            Long orderId,
            String reason
    ) {
        Order order = orders
                .findByIdForUpdate(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );

        if (OrderPolicy.RETURNED.equals(
                order.getOrderStatus()
        )) {
            return query.adminDetailInternal(order);
        }

        if (!OrderPolicy.COMPLETED.equals(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        order.setOrderStatus(OrderPolicy.RETURNED);
        order.setReturnedAt(
                LocalDateTime.now(ZoneOffset.UTC)
        );
        order.setCustomerServiceNote(
                appendNote(
                        order.getCustomerServiceNote(),
                        "RETURN: " + reason.trim()
                )
        );

        orders.save(order);

        audit.record(
                actor,
                "ORDER_RETURN_ACCEPT",
                "ORDER",
                orderId
        );

        return query.adminDetailInternal(order);
    }

    private String appendNote(
            String current,
            String addition
    ) {
        if (current == null || current.isBlank()) {
            return addition;
        }

        return current + "\n" + addition;
    }
}
