package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.Cart;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends Repository<Cart, Long> {

    Optional<Cart> findById(Long id);

    List<Cart> findAllByAccountIdAndStatusOrderByCartIdAsc(Long accountId, String status);

    /**
     * The Account row is locked before this query. Locking every OPEN row then lets the
     * command fail closed on legacy duplicate OPEN carts instead of choosing by timestamp.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select c from Cart c
            where c.accountId = :accountId and c.status = 'OPEN'
            order by c.cartId asc
            """)
    List<Cart> findOpenForUpdateByAccountId(@Param("accountId") Long accountId);

    Cart save(Cart entity);
}
