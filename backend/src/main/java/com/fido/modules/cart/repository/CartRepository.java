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

    /** Bên gọi khóa tài khoản trước; khóa mọi giỏ OPEN để phát hiện dữ liệu trùng thay vì tự chọn một giỏ. */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select c from Cart c
            where c.accountId = :accountId and c.status = 'OPEN'
            order by c.cartId asc
            """)
    List<Cart> findOpenForUpdateByAccountId(@Param("accountId") Long accountId);

    Cart save(Cart entity);
}
