package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderVoucherSnapshot;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Immutable voucher terms and applied amount captured for an Order. */
public interface OrderVoucherSnapshotRepository extends Repository<OrderVoucherSnapshot, Long> {
    Optional<OrderVoucherSnapshot> findById(Long orderId);
    OrderVoucherSnapshot save(OrderVoucherSnapshot snapshot);
}
