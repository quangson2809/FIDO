package com.fido.modules.cart.service;

import com.fido.modules.cart.dto.request.CartItemCreateRequest;
import com.fido.modules.cart.dto.request.CartItemQuantityRequest;
import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.dto.response.CartItemDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.product.service.CatalogVariantReadService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CartService {

    private final CartRepository carts;
    private final CartItemRepository items;
    private final CatalogVariantReadService catalog;

    public CartService(
            CartRepository carts,
            CartItemRepository items,
            CatalogVariantReadService catalog
    ) {
        this.carts = carts;
        this.items = items;
        this.catalog = catalog;
    }

    public CartDto current(Long accountId) {
        Cart cart = currentOrCreate(accountId);
        return toDto(cart);
    }

    public CartDto add(
            Long accountId,
            CartItemCreateRequest request
    ) {
        Cart cart = currentOrCreate(accountId);

        var variant = catalog.get(request.variant_id());

        if (!variant.purchasable()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        CartItem item = items
                .findByCartIdAndVariantId(
                        cart.getCartId(),
                        request.variant_id()
                )
                .orElseGet(() -> {
                    CartItem created = new CartItem();
                    created.setCartId(cart.getCartId());
                    created.setVariantId(request.variant_id());
                    created.setQuantity(0);
                    return created;
                });

        try {
            item.setQuantity(
                    Math.addExact(
                            item.getQuantity(),
                            request.quantity()
                    )
            );
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        items.save(item);
        touch(cart);

        return toDto(cart);
    }

    public CartDto updateQuantity(
            Long accountId,
            Long cartItemId,
            CartItemQuantityRequest request
    ) {
        Cart cart = currentOrCreate(accountId);

        CartItem item = ownedItem(
                cart.getCartId(),
                cartItemId
        );

        item.setQuantity(request.quantity());
        items.save(item);

        touch(cart);

        return toDto(cart);
    }

    public CartDto deleteItem(
            Long accountId,
            Long cartItemId
    ) {
        Cart cart = currentOrCreate(accountId);

        CartItem item = ownedItem(
                cart.getCartId(),
                cartItemId
        );

        items.delete(item);
        touch(cart);

        return toDto(cart);
    }

    public CartDto clear(Long accountId) {
        Cart cart = currentOrCreate(accountId);

        items.deleteByCartId(
                cart.getCartId()
        );

        touch(cart);

        return toDto(cart);
    }

    @Transactional(readOnly = true)
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

    private Cart currentOrCreate(Long accountId) {
        return carts
                .findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setAccountId(accountId);
                    return carts.save(cart);
                });
    }

    private CartItem ownedItem(
            Long cartId,
            Long cartItemId
    ) {
        return items
                .findByCartItemIdAndCartId(
                        cartItemId,
                        cartId
                )
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private CartDto toDto(Cart cart) {
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

        return new CartItemDto(
                item.getCartItemId(),
                item.getVariantId(),
                item.getQuantity(),
                variant.productName(),
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
                variant.sku(),
                variant.size(),
                variant.color(),
                variant.unitPrice(),
                resolved.lineTotal(),
                variant.availableQuantity(),
                variant.purchasable()
        );
    }

    private void touch(Cart cart) {
        cart.setUpdatedAt(
                LocalDateTime.now(ZoneOffset.UTC)
        );

        carts.save(cart);
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
