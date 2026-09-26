package com.fido.modules.order.repository;

import com.fido.modules.order.entity.Payment;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface PaymentRepository extends Repository<Payment, Long> {
    Optional<Payment> findById(Long id);
    Payment save(Payment entity);
}
