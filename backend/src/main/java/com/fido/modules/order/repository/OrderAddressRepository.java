package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderAddress;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Immutable order-time receiver/address snapshot. */
public interface OrderAddressRepository extends Repository<OrderAddress, Long> {
    Optional<OrderAddress> findById(Long orderId);
    OrderAddress save(OrderAddress snapshot);
}
