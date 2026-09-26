package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.CartItem;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface CartItemRepository extends Repository<CartItem, Long> {
    Optional<CartItem> findById(Long id);
    CartItem save(CartItem entity);
}
