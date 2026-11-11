package com.fido.modules.order.repository;

import com.fido.modules.order.entity.Payment;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends Repository<Payment, Long> {

    Optional<Payment> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select payment from Payment payment where payment.orderId = :orderId")
    Optional<Payment> findByOrderIdForUpdate(@Param("orderId") Long orderId);

    List<Payment> findAllByOrderIdIn(Collection<Long> orderIds);

    Payment save(Payment entity);
}
