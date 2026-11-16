package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderAddress;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Địa chỉ chụp lúc đặt đơn độc lập với sổ địa chỉ hiện tại của tài khoản. */
public interface OrderAddressRepository extends Repository<OrderAddress, Long> {
    Optional<OrderAddress> findById(Long orderId);
    OrderAddress save(OrderAddress snapshot);
}
