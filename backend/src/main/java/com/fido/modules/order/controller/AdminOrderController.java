package com.fido.modules.order.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.order.dto.request.AdminOrderPatchRequest;
import com.fido.modules.order.dto.request.AfterSalesRequest;
import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.dto.request.PaymentActionRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.dto.response.PaymentAdminDto;
import com.fido.modules.order.service.OrderActionService;
import com.fido.modules.order.service.OrderAfterSalesService;
import com.fido.modules.order.service.OrderEditService;
import com.fido.modules.order.service.OrderPaymentService;
import com.fido.modules.order.service.OrderQueryService;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/orders")
public class AdminOrderController {

    private final OrderQueryService query;
    private final OrderEditService edit;
    private final OrderActionService actions;
    private final OrderPaymentService payments;
    private final OrderAfterSalesService afterSales;

    public AdminOrderController(
            OrderQueryService query,
            OrderEditService edit,
            OrderActionService actions,
            OrderPaymentService payments,
            OrderAfterSalesService afterSales
    ) {
        this.query = query;
        this.edit = edit;
        this.actions = actions;
        this.payments = payments;
        this.afterSales = afterSales;
    }

    @GetMapping
    public ApiListResponse<OrderSummaryDto> list(
            @RequestParam(name = "order_code", required = false)
                    String orderCode,
            @RequestParam(name = "order_status", required = false)
                    String orderStatus,
            @RequestParam(name = "payment_status", required = false)
                    String paymentStatus,
            @RequestParam(name = "created_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    LocalDateTime createdFrom,
            @RequestParam(name = "created_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    LocalDateTime createdTo,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false)
                    Integer pageSize
    ) {
        return query.adminOrders(
                orderCode,
                orderStatus,
                paymentStatus,
                createdFrom,
                createdTo,
                page,
                pageSize
        );
    }

    @GetMapping("/{orderId}")
    public ApiResponse<OrderAdminDetailDto> detail(
            Authentication authentication,
            @PathVariable Long orderId
    ) {
        return ApiResponse.of(
                query.adminDetail(
                        orderId,
                        authentication
                )
        );
    }

    @PatchMapping("/{orderId}")
    public ApiResponse<OrderAdminDetailDto> update(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication,
            @PathVariable Long orderId,
            @Valid @RequestBody AdminOrderPatchRequest request
    ) {
        return ApiResponse.of(
                edit.updateAdmin(
                        actor(jwt),
                        orderId,
                        request,
                        authentication
                )
        );
    }

    @PostMapping("/{orderId}/actions")
    public ApiResponse<OrderAdminDetailDto> action(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication,
            @PathVariable Long orderId,
            @Valid @RequestBody OrderActionRequest request
    ) {
        return ApiResponse.of(
                actions.action(
                        actor(jwt),
                        orderId,
                        request,
                        authentication
                )
        );
    }

    @PostMapping("/{orderId}/payment-actions")
    public ApiResponse<PaymentAdminDto> payment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long orderId,
            @Valid @RequestBody PaymentActionRequest request
    ) {
        return ApiResponse.of(
                payments.action(
                        actor(jwt),
                        orderId,
                        request
                )
        );
    }

    @PostMapping("/{orderId}/after-sales")
    public ApiResponse<OrderAdminDetailDto> afterSales(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication,
            @PathVariable Long orderId,
            @Valid @RequestBody AfterSalesRequest request
    ) {
        return ApiResponse.of(
                afterSales.process(
                        actor(jwt),
                        orderId,
                        request,
                        authentication
                )
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
