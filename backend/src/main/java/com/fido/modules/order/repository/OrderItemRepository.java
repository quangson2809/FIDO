package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

/**
 * OrderItem rows are immutable historical snapshots.
 */
public interface OrderItemRepository extends Repository<OrderItem, Long> {

    Optional<OrderItem> findById(Long id);

    List<OrderItem> findAllByOrderIdOrderByOrderItemIdAsc(
            Long orderId
    );

    OrderItem save(OrderItem entity);
}
