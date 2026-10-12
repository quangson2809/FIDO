package com.fido.modules.order.repository;

import com.fido.modules.order.entity.Payment;

import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends Repository<Payment, Long> {

    Optional<Payment> findById(Long id);

    List<Payment> findAllByOrderIdIn(Collection<Long> orderIds);

    Payment save(Payment entity);
}
