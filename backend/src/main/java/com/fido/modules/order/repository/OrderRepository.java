package com.fido.modules.order.repository;

import com.fido.modules.order.entity.Order;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Order history is never hard-deleted through the application repository.
 */
public interface OrderRepository
        extends Repository<Order, Long>, JpaSpecificationExecutor<Order> {

    Optional<Order> findById(Long id);

    Order save(Order entity);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select orderEntity
            from Order orderEntity
            where orderEntity.orderId = :orderId
            """)
    Optional<Order> findByIdForUpdate(
            @Param("orderId") Long orderId
    );
}
