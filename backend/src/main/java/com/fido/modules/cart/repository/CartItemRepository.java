package com.fido.modules.cart.repository;

import com.fido.modules.cart.entity.CartItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends Repository<CartItem, Long> {

    Optional<CartItem> findById(Long id);

    Optional<CartItem> findByCartItemIdAndCartId(
            Long cartItemId,
            Long cartId
    );

    Optional<CartItem> findByCartIdAndVariantId(
            Long cartId,
            Long variantId
    );

    List<CartItem> findAllByCartIdOrderByCartItemIdAsc(
            Long cartId
    );

    CartItem save(CartItem entity);

    void delete(CartItem entity);

    @Modifying(flushAutomatically = true)
    @Query("""
            delete from CartItem item
            where item.cartId = :cartId
            """)
    int deleteByCartId(
            @Param("cartId") Long cartId
    );
}
