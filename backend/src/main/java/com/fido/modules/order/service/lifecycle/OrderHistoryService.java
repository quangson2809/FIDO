package com.fido.modules.order.service.lifecycle;

import com.fido.modules.audit.service.OrderOperationHistoryService;
import com.fido.modules.order.repository.OrderRepository;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class OrderHistoryService {
    private final OrderRepository orders;
    private final OrderOperationHistoryService history;

    public OrderHistoryService(OrderRepository orders, OrderOperationHistoryService history) {
        this.orders = orders;
        this.history = history;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_READ')")
    public List<OrderOperationHistoryService.Entry> list(long id) {
        orders.findById(id)
                .orElseThrow(
                        () ->
                                new org.springframework.web.server.ResponseStatusException(
                                        org.springframework.http.HttpStatus.NOT_FOUND,
                                        "ORDER_NOT_FOUND"));
        return history.forOrder(id);
    }
}
