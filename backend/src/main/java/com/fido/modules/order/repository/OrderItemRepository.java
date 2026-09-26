package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderItem;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface OrderItemRepository extends Repository<OrderItem, Long> {
    Optional<OrderItem> findById(Long id);
    OrderItem save(OrderItem entity);
}
