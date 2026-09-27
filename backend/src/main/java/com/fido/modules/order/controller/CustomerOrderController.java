package com.fido.modules.order.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.order.dto.request.RecipientPatchRequest;
import com.fido.modules.order.dto.response.OrderCustomerDetailDto;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.service.OrderEditService;
import com.fido.modules.order.service.OrderQueryService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/orders")
public class CustomerOrderController {

    private final OrderQueryService query;
    private final OrderEditService edit;

    public CustomerOrderController(
            OrderQueryService query,
            OrderEditService edit
    ) {
        this.query = query;
        this.edit = edit;
    }

    @GetMapping
    public ApiListResponse<OrderSummaryDto> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "order_status", required = false)
                    String orderStatus,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false)
                    Integer pageSize
    ) {
        return query.customerOrders(
                actor(jwt),
                orderStatus,
                page,
                pageSize
        );
    }

    @GetMapping("/{orderId}")
    public ApiResponse<OrderCustomerDetailDto> detail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long orderId
    ) {
        return ApiResponse.of(
                query.customerDetail(
                        actor(jwt),
                        orderId
                )
        );
    }

    @PatchMapping("/{orderId}/recipient")
    public ApiResponse<OrderCustomerDetailDto> recipient(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long orderId,
            @Valid @RequestBody RecipientPatchRequest request
    ) {
        return ApiResponse.of(
                edit.updateRecipient(
                        actor(jwt),
                        orderId,
                        request
                )
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
