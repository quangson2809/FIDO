package com.fido.modules.order.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.dto.response.OrderCustomerDetailDto;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.mapper.OrderMapper;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class OrderQueryService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_READ')";

    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shipping;
    private final OrderActionPolicy actionPolicy;
    private final OrderAuthorization authorization;

    public OrderQueryService(
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            ShippingInfoRepository shipping,
            OrderActionPolicy actionPolicy,
            OrderAuthorization authorization
    ) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.shipping = shipping;
        this.actionPolicy = actionPolicy;
        this.authorization = authorization;
    }

    public ApiListResponse<OrderSummaryDto> customerOrders(
            Long accountId,
            String orderStatus,
            Integer page,
            Integer pageSize
    ) {
        if (orderStatus != null) {
            OrderPolicy.requireOrderStatus(orderStatus);
        }

        Pagination pagination = Pagination.of(page, pageSize);

        Specification<Order> specification =
                OrderSpecifications.customerOrders(accountId, orderStatus);

        var result = orders.findAll(
                specification,
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(this::summary)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    public OrderCustomerDetailDto customerDetail(
            Long accountId,
            Long orderId
    ) {
        Order order = customerOrder(accountId, orderId);
        return customerDetailInternal(order);
    }

    @PreAuthorize(READ)
    public ApiListResponse<OrderSummaryDto> adminOrders(
            String orderCode,
            String orderStatus,
            String paymentStatus,
            LocalDateTime createdFrom,
            LocalDateTime createdTo,
            Integer page,
            Integer pageSize
    ) {
        if (orderStatus != null) {
            OrderPolicy.requireOrderStatus(orderStatus);
        }

        if (paymentStatus != null
                && !List.of(
                        OrderPolicy.UNPAID,
                        OrderPolicy.PAID,
                        OrderPolicy.REFUNDED
                ).contains(paymentStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        if (createdFrom != null
                && createdTo != null
                && createdFrom.isAfter(createdTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        Pagination pagination = Pagination.of(page, pageSize);

        var result = orders.findAll(
                OrderSpecifications.adminOrders(
                        orderCode,
                        orderStatus,
                        paymentStatus,
                        createdFrom,
                        createdTo
                ),
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(this::summary)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    @PreAuthorize(READ)
    public OrderAdminDetailDto adminDetail(
            Long orderId,
            Authentication authentication
    ) {
        return adminDetailInternal(
                order(orderId),
                authentication
        );
    }

    OrderCustomerDetailDto customerDetailInternal(Order order) {
        var orderItems = items
                .findAllByOrderIdOrderByOrderItemIdAsc(
                        order.getOrderId()
                )
                .stream()
                .map(OrderMapper::item)
                .toList();

        Payment payment = payment(order.getOrderId());

        var shippingInfo = shipping
                .findById(order.getOrderId())
                .orElse(null);

        return new OrderCustomerDetailDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                OrderMapper.recipient(order),
                orderItems,
                order.getSubtotalSnapshot(),
                order.getDiscountSnapshot(),
                order.getShippingFeeSnapshot(),
                order.getTotalSnapshot(),
                OrderMapper.paymentPublic(payment),
                OrderMapper.shipping(shippingInfo),
                order.getCompletedAt(),
                order.getReturnedAt(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    OrderAdminDetailDto adminDetailInternal(
            Order order,
            Authentication authentication
    ) {
        var orderItems = items
                .findAllByOrderIdOrderByOrderItemIdAsc(
                        order.getOrderId()
                )
                .stream()
                .map(OrderMapper::item)
                .toList();

        Payment payment = payment(order.getOrderId());

        var shippingInfo = shipping
                .findById(order.getOrderId())
                .orElse(null);

        return new OrderAdminDetailDto(
                order.getOrderId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                OrderMapper.recipient(order),
                orderItems,
                order.getSubtotalSnapshot(),
                order.getDiscountSnapshot(),
                order.getShippingFeeSnapshot(),
                order.getTotalSnapshot(),
                OrderMapper.shipping(shippingInfo),
                order.getCompletedAt(),
                order.getReturnedAt(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getCustomerAccountId(),
                order.getVoucherId(),
                order.getCustomerServiceNote(),
                order.getCancelReason(),
                OrderMapper.paymentAdmin(payment),
                authorization.filterAllowed(
                        authentication,
                        actionPolicy.allowedActions(order, payment)
                )
        );
    }

    private OrderSummaryDto summary(Order order) {
        return OrderMapper.summary(
                order,
                payment(order.getOrderId())
        );
    }

    private Order customerOrder(
            Long accountId,
            Long orderId
    ) {
        Order order = order(orderId);

        if (!Objects.equals(
                order.getCustomerAccountId(),
                accountId
        )) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        return order;
    }

    private Order order(Long orderId) {
        return orders.findById(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private Payment payment(Long orderId) {
        return payments.findById(orderId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Order payment is missing"
                        )
                );
    }
}

