package com.fido.modules.cart.service;

import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.dto.response.CartItemDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.product.service.CatalogProductReadService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CartQueryService {
    private final CartRepository carts;
    private final CartItemRepository items;
    private final CatalogProductReadService catalog;

    public CartQueryService(CartRepository carts, CartItemRepository items, CatalogProductReadService catalog) {
        this.carts = carts;
        this.items = items;
        this.catalog = catalog;
    }

    public CartDto current(Long accountId) {
        return carts.findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .map(this::toDto)
                .orElseGet(() -> new CartDto(null, accountId, List.of(), BigDecimal.ZERO, null, null));
    }

    public CheckoutCartView checkoutView(Long accountId) {
        return carts.findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .map(this::toCheckoutView)
                .orElseGet(() -> new CheckoutCartView(null, List.of(), BigDecimal.ZERO));
    }

    CartDto toDto(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);
        return new CartDto(cart.getCartId(), cart.getAccountId(),
                resolved.items().stream().map(this::toCartItemDto).toList(),
                resolved.subtotal(), cart.getCreatedAt(), cart.getUpdatedAt());
    }

    private CheckoutCartView toCheckoutView(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);
        return new CheckoutCartView(cart.getCartId(),
                resolved.items().stream().map(this::toCheckoutItem).toList(), resolved.subtotal());
    }

    private ResolvedCart resolveCart(Cart cart) {
        List<CartItem> cartItems = items.findAllByCartIdOrderByCartItemIdAsc(cart.getCartId());
        Map<Long, CatalogProductReadService.ProductView> productsById =
                catalog.getAll(cartItems.stream().map(CartItem::getProductId).toList());
        var resolvedItems = cartItems.stream()
                .map(item -> resolve(item, productsById.get(item.getProductId()))).toList();
        BigDecimal subtotal = resolvedItems.stream().map(ResolvedCartItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ResolvedCart(resolvedItems, subtotal);
    }

    private ResolvedCartItem resolve(CartItem item, CatalogProductReadService.ProductView product) {
        if (product == null) throw new IllegalStateException("Cart item references missing product");
        BigDecimal lineTotal = product.unitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new ResolvedCartItem(item, product, lineTotal);
    }

    private CartItemDto toCartItemDto(ResolvedCartItem resolved) {
        CartItem item = resolved.item();
        var product = resolved.product();
        return new CartItemDto(item.getCartItemId(), item.getProductId(), item.getQuantity(),
                product.productName(), product.imageUrl(), product.imageUrl(), product.sku(),
                product.unitPrice(), resolved.lineTotal(), product.availableQuantity());
    }

    private CheckoutCartView.Item toCheckoutItem(ResolvedCartItem resolved) {
        CartItem item = resolved.item();
        var product = resolved.product();
        return new CheckoutCartView.Item(item.getProductId(), item.getQuantity(),
                product.productName(), product.imageUrl(), product.sku(), product.unitPrice(),
                resolved.lineTotal(), product.availableQuantity(), product.purchasable());
    }

    private record ResolvedCart(List<ResolvedCartItem> items, BigDecimal subtotal) {
        private ResolvedCart { items = List.copyOf(items); }
    }

    private record ResolvedCartItem(
            CartItem item, CatalogProductReadService.ProductView product, BigDecimal lineTotal) {}
}
