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

    @Query("""
            select new com.fido.modules.order.dto.response.CustomerOrderStats(
                o.customerAccountId, count(o), max(o.createdAt))
            from Order o where o.customerAccountId in :accountIds
            group by o.customerAccountId
            """)
    java.util.List<com.fido.modules.order.dto.response.CustomerOrderStats> customerStats(
            @Param("accountIds") java.util.Collection<Long> accountIds);

    @Query("""
            select new com.fido.modules.order.dto.response.OrderSummaryDto(
                o.orderId, o.orderCode, o.orderStatus, p.paymentStatus,
                o.totalSnapshot, o.createdAt, o.completedAt, o.returnedAt)
            from Order o join Payment p on p.orderId = o.orderId
            where o.customerAccountId = :accountId
            order by o.createdAt desc, o.orderId desc
            """)
    java.util.List<com.fido.modules.order.dto.response.OrderSummaryDto> customerSummaries(
            @Param("accountId") Long accountId);

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

