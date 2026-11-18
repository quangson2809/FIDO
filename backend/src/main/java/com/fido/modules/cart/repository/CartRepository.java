package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.Cart;

import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CartRepository extends Repository<Cart, Long> {

    Optional<Cart> findById(Long id);

    Optional<Cart> findByAccountId(Long accountId);

    /** Bên gọi khóa tài khoản trước cả khi giỏ chưa tồn tại. */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query(
            """
            select c from Cart c
            where c.accountId = :accountId
            """)
    Optional<Cart> findByAccountIdForUpdate(@Param("accountId") Long accountId);

    Cart save(Cart entity);
}
