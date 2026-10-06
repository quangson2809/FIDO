package com.fido.modules.cart.service;

import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.dto.response.CartItemDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.product.service.CatalogVariantReadService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CartQueryService {
    private final CartRepository carts;
    private final CartItemRepository items;
    private final CatalogVariantReadService catalog;

    public CartQueryService(CartRepository carts, CartItemRepository items,
                            CatalogVariantReadService catalog) {
        this.carts = carts;
        this.items = items;
        this.catalog = catalog;
    }

    public CartDto current(Long accountId) {
        return carts.findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .map(this::toDto)
                .orElseGet(() -> new CartDto(
                        null, accountId, List.of(), BigDecimal.ZERO, null, null
                ));
    }

    public CheckoutCartView checkoutView(Long accountId) {
        return carts
                .findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .map(this::toCheckoutView)
                .orElseGet(() ->
                        new CheckoutCartView(
                                null,
                                List.of(),
                                BigDecimal.ZERO
                        )
                );
    }

    CartDto toDto(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);

        var itemDtos = resolved.items()
                .stream()
                .map(this::toCartItemDto)
                .toList();

        return new CartDto(
                cart.getCartId(),
                cart.getAccountId(),
                itemDtos,
                resolved.subtotal(),
                cart.getCreatedAt(),
                cart.getUpdatedAt()
        );
    }

    private CheckoutCartView toCheckoutView(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);

        var checkoutItems = resolved.items()
                .stream()
                .map(this::toCheckoutItem)
                .toList();

        return new CheckoutCartView(
                cart.getCartId(),
                checkoutItems,
                resolved.subtotal()
        );
    }

    private ResolvedCart resolveCart(Cart cart) {
        List<CartItem> cartItems =
                items.findAllByCartIdOrderByCartItemIdAsc(
                        cart.getCartId()
                );

        Map<Long, CatalogVariantReadService.VariantView> variantsById =
                catalog.getAll(
                        cartItems.stream()
                                .map(CartItem::getVariantId)
                                .toList()
                );

        var resolvedItems = cartItems.stream()
                .map(item ->
                        resolve(
                                item,
                                variantsById.get(item.getVariantId())
                        )
                )
                .toList();

        BigDecimal subtotal = resolvedItems.stream()
                .map(ResolvedCartItem::lineTotal)
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                );

        return new ResolvedCart(
                resolvedItems,
                subtotal
        );
    }

    private ResolvedCartItem resolve(
            CartItem item,
            CatalogVariantReadService.VariantView variant
    ) {
        if (variant == null) {
            throw new IllegalStateException(
                    "Cart item references missing catalog variant"
            );
        }

        BigDecimal lineTotal = variant.unitPrice()
                .multiply(
                        BigDecimal.valueOf(item.getQuantity())
                );

        return new ResolvedCartItem(
                item,
                variant,
                lineTotal
        );
    }

    private CartItemDto toCartItemDto(
            ResolvedCartItem resolved
    ) {
        CartItem item = resolved.item();
        var variant = resolved.variant();
<<<<<<< HEAD

=======
        String thumbnail = variant.imageUrl();
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
        return new CartItemDto(
                item.getCartItemId(),
                item.getVariantId(),
                item.getQuantity(),
                variant.productName(),
<<<<<<< HEAD
=======
                thumbnail,
                thumbnail,
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
                variant.size(),
                variant.color(),
                variant.unitPrice(),
                resolved.lineTotal(),
                variant.availableQuantity()
        );
    }

    private CheckoutCartView.Item toCheckoutItem(
            ResolvedCartItem resolved
    ) {
        CartItem item = resolved.item();
        var variant = resolved.variant();

        return new CheckoutCartView.Item(
                item.getVariantId(),
                item.getQuantity(),
                variant.productName(),
                variant.imageUrl(),
                variant.sku(),
                variant.size(),
                variant.color(),
                variant.unitPrice(),
                resolved.lineTotal(),
                variant.availableQuantity(),
                variant.purchasable()
        );
    }

    private record ResolvedCart(
            List<ResolvedCartItem> items,
            BigDecimal subtotal
    ) {
        private ResolvedCart {
            items = List.copyOf(items);
        }
    }

    private record ResolvedCartItem(
            CartItem item,
            CatalogVariantReadService.VariantView variant,
            BigDecimal lineTotal
    ) {
    }
}
