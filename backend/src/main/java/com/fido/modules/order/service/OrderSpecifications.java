package com.fido.modules.order.service;

import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.Payment;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * Persistence predicates for order history queries.
 */
public final class OrderSpecifications {

    private OrderSpecifications() {
    }

    public static Specification<Order> customerOrders(
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

    public static Specification<Order> adminOrders(
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
}
