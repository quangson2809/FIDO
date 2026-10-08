package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.Cart;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface CartRepository extends Repository<Cart, Long> {

    Optional<Cart> findById(Long id);

    Optional<Cart> findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(
            Long accountId
    );

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<Cart> findFirstForUpdateByAccountIdOrderByUpdatedAtDescCartIdDesc(Long accountId);

    Cart save(Cart entity);
}
