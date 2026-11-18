package com.fido.modules.cart.entity;

import com.fido.common.exception.BusinessRuleException;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "cart_items",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uq_cart_items_cart_product",
                        columnNames = {"cart_id", "product_id"}))
@Getter
@Setter
@NoArgsConstructor
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long cartItemId;

    @Column(name = "cart_id", nullable = false)
    private Long cartId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false)
    @Setter(AccessLevel.NONE)
    private Integer quantity;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    public void changeQuantity(Integer quantity) {
        requirePositive(quantity);
        this.quantity = quantity;
    }

    public void increaseQuantity(Integer amount) {
        requirePositive(amount);
        requirePositive(quantity);
        try {
            quantity = Math.addExact(quantity, amount);
        } catch (ArithmeticException overflow) {
            throw BusinessRuleException.invalid("VALIDATION_ERROR");
        }
    }

    private static void requirePositive(Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw BusinessRuleException.invalid("VALIDATION_ERROR");
        }
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
