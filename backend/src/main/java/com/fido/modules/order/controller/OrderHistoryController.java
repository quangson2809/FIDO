package com.fido.modules.order.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.audit.service.OrderOperationHistoryService;
import com.fido.modules.order.service.lifecycle.OrderHistoryService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/orders/{orderId}/history")
public class OrderHistoryController {
    private final OrderHistoryService service;

    public OrderHistoryController(OrderHistoryService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<OrderOperationHistoryService.Entry>> list(@PathVariable long orderId) {
        return ApiResponse.of(service.list(orderId));
    }
}
