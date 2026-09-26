package com.fido.modules.order.repository;

import com.fido.modules.order.entity.Order;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface OrderRepository extends Repository<Order, Long> {
    Optional<Order> findById(Long id);
    Order save(Order entity);
}
