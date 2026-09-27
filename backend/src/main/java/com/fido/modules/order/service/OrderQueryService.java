package com.fido.modules.order.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.inventory.repository.InventoryTransactionRepository;
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
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final InventoryTransactionRepository inventoryTransactions;

    public OrderQueryService(
            OrderRepository orders,
            OrderItemRepository items,
            PaymentRepository payments,
            ShippingInfoRepository shipping,
            InventoryTransactionRepository inventoryTransactions
    ) {
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.shipping = shipping;
        this.inventoryTransactions = inventoryTransactions;
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

        Pagination pagination = pagination(page, pageSize);

        Specification<Order> specification =
                customerSpec(accountId, orderStatus);

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

        Pagination pagination = pagination(page, pageSize);

        var result = orders.findAll(
                adminSpec(
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
    public OrderAdminDetailDto adminDetail(Long orderId) {
        return adminDetailInternal(
                order(orderId)
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

    OrderAdminDetailDto adminDetailInternal(Order order) {
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
                allowedActions(order, payment)
        );
    }

    private OrderSummaryDto summary(Order order) {
        return OrderMapper.summary(
                order,
                payment(order.getOrderId())
        );
    }

    private List<String> allowedActions(
            Order order,
            Payment payment
    ) {
        var actions = new ArrayList<String>();

        switch (order.getOrderStatus()) {
            case OrderPolicy.PENDING -> {
                addIfAllowed(
                        actions,
                        "CONFIRM",
                        OrderPolicy.ORDER_PROCESS
                );
                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            case OrderPolicy.CONFIRMED -> {
                addIfAllowed(
                        actions,
                        "PREPARE",
                        OrderPolicy.ORDER_PROCESS
                );
                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            case OrderPolicy.PREPARING -> {
                addIfAllowed(
                        actions,
                        "SHIP",
                        OrderPolicy.ORDER_FULFILLMENT
                );
                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            case OrderPolicy.SHIPPING -> {
                addIfAllowed(
                        actions,
                        "DELIVERY_FAILED",
                        OrderPolicy.ORDER_EXCEPTION
                );

                if (OrderPolicy.PAID.equals(payment.getPaymentStatus())) {
                    addIfAllowed(
                            actions,
                            "COMPLETE",
                            OrderPolicy.ORDER_FULFILLMENT
                    );
                }
            }
            case OrderPolicy.DELIVERY_FAILED -> {
                boolean alreadyReturned =
                        inventoryTransactions
                                .existsByOrderIdAndTransactionType(
                                        order.getOrderId(),
                                        OrderPolicy.DELIVERY_RETURN_IN
                                );

                if (!alreadyReturned) {
                    addIfAllowed(
                            actions,
                            "RETRY_DELIVERY",
                            OrderPolicy.ORDER_FULFILLMENT
                    );
                    addIfAllowed(
                            actions,
                            "DELIVERY_RETURN_IN",
                            OrderPolicy.ORDER_EXCEPTION
                    );
                }

                addIfAllowed(
                        actions,
                        "CANCEL",
                        OrderPolicy.ORDER_EXCEPTION
                );
            }
            default -> {
                // Terminal/baseline after-sales states expose no order-state command.
            }
        }

        return actions;
    }

    private void addIfAllowed(
            List<String> actions,
            String action,
            String permission
    ) {
        if (hasCapability(permission)) {
            actions.add(action);
        }
    }

    private boolean hasCapability(String permission) {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return false;
        }

        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_SUPERADMIN".equals(authority.getAuthority())
                        || ("PERMISSION_" + permission)
                                .equals(authority.getAuthority())
                );
    }

    private Specification<Order> customerSpec(
            Long accountId,
            String orderStatus
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            predicates.add(
                    cb.equal(
                            root.get("customerAccountId"),
                            accountId
                    )
            );

            if (orderStatus != null) {
                predicates.add(
                        cb.equal(
                                root.get("orderStatus"),
                                orderStatus
                        )
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    private Specification<Order> adminSpec(
            String orderCode,
            String orderStatus,
            String paymentStatus,
            LocalDateTime createdFrom,
            LocalDateTime createdTo
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (orderCode != null
                    && !orderCode.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("orderCode")),
                                "%"
                                        + orderCode.trim()
                                                .toLowerCase(Locale.ROOT)
                                        + "%"
                        )
                );
            }

            if (orderStatus != null) {
                predicates.add(
                        cb.equal(
                                root.get("orderStatus"),
                                orderStatus
                        )
                );
            }

            if (createdFrom != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("createdAt"),
                                createdFrom
                        )
                );
            }

            if (createdTo != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("createdAt"),
                                createdTo
                        )
                );
            }

            if (paymentStatus != null) {
                Subquery<Long> paymentQuery =
                        query.subquery(Long.class);

                var paymentRoot =
                        paymentQuery.from(Payment.class);

                paymentQuery
                        .select(paymentRoot.get("orderId"))
                        .where(
                                cb.equal(
                                        paymentRoot.get("orderId"),
                                        root.get("orderId")
                                ),
                                cb.equal(
                                        paymentRoot.get("paymentStatus"),
                                        paymentStatus
                                )
                        );

                predicates.add(
                        cb.exists(paymentQuery)
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
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

    private Pagination pagination(
            Integer page,
            Integer pageSize
    ) {
        try {
            return Pagination.of(page, pageSize);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }
}
