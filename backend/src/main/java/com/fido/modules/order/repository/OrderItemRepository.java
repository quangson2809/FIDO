package com.fido.modules.order.repository;

import com.fido.modules.order.entity.OrderItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * OrderItem rows are immutable historical snapshots.
 */
public interface OrderItemRepository extends Repository<OrderItem, Long> {

    Optional<OrderItem> findById(Long id);

    List<OrderItem> findAllByOrderIdOrderByOrderItemIdAsc(
            Long orderId
    );

    @Query("""
            select item
            from OrderItem item
            where item.orderId in :orderIds
              and item.orderItemId = (
                  select min(firstItem.orderItemId)
                  from OrderItem firstItem
                  where firstItem.orderId = item.orderId
              )
            """)
    List<OrderItem> findFirstItemsByOrderIdIn(
            @Param("orderIds") List<Long> orderIds
    );

    OrderItem save(OrderItem entity);
}
