package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.Cart;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface CartRepository extends Repository<Cart, Long> {
    Optional<Cart> findById(Long id);
    Cart save(Cart entity);
}
