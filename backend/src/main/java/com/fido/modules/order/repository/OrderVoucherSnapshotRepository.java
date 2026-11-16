package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderVoucherSnapshot;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Giữ điều khoản voucher và số tiền thực giảm tại thời điểm đặt đơn. */
public interface OrderVoucherSnapshotRepository extends Repository<OrderVoucherSnapshot, Long> {
    Optional<OrderVoucherSnapshot> findById(Long orderId);
    OrderVoucherSnapshot save(OrderVoucherSnapshot snapshot);
}
