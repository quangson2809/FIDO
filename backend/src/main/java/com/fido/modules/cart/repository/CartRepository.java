package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.Cart;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface CartRepository extends Repository<Cart, Long> {

    Optional<Cart> findById(Long id);

    Optional<Cart> findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(
            Long accountId
    );

    Cart save(Cart entity);
}
