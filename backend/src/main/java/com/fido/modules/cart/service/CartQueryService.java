package com.fido.modules.cart.service;

import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.dto.response.CartItemDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.product.service.query.CatalogProductReadService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CartQueryService {
    private final CartRepository carts;
    private final CartItemRepository items;
    private final CatalogProductReadService catalog;
    private final PricingService pricing;

    public CartQueryService(
            CartRepository carts, CartItemRepository items, CatalogProductReadService catalog) {
        this(carts, items, catalog, new PricingService());
    }

    @Autowired
    public CartQueryService(
            CartRepository carts,
            CartItemRepository items,
            CatalogProductReadService catalog,
            PricingService pricing) {
        this.carts = carts;
        this.items = items;
        this.catalog = catalog;
        this.pricing = pricing;
    }

    public CartDto current(Long accountId) {
        Cart cart = currentCart(accountId);
        return cart == null ? emptyCart(accountId) : toDto(cart);
    }

    public CheckoutCartView checkoutView(Long accountId) {
        Cart cart = currentCart(accountId);
        return cart == null ? new CheckoutCartView(null, List.of(), 0L) : toCheckoutView(cart);
    }

    CartDto emptyCart(Long accountId) {
        return new CartDto(null, accountId, List.of(), 0L, null, null);
    }

    CartDto toDto(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);
        return new CartDto(
                cart.getCartId(),
                cart.getAccountId(),
                resolved.items().stream().map(this::toCartItemDto).toList(),
                resolved.subtotal(),
                cart.getCreatedAt(),
                cart.getUpdatedAt());
    }

    private Cart currentCart(Long accountId) {
        return carts.findByAccountId(accountId).orElse(null);
    }

    private CheckoutCartView toCheckoutView(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);
        return new CheckoutCartView(
                cart.getCartId(),
                resolved.items().stream().map(this::toCheckoutItem).toList(),
                resolved.subtotal());
    }

    /**
     * cart lấy từ DB của tài khoản; đọc lại thông tin bán hàng theo Product ID rồi tính tiền VND.
     * Không tin giá cũ từ UI và không giữ hàng ở bước đọc giỏ.
     */
    private ResolvedCart resolveCart(Cart cart) {
        List<CartItem> cartItems = items.findAllByCartIdOrderByCartItemIdAsc(cart.getCartId());
        Map<Long, CatalogProductReadService.ProductView> productsById =
                catalog.getAll(cartItems.stream().map(CartItem::getProductId).toList());
        List<ResolvedCartItem> rawItems =
                cartItems.stream()
                        .map(item -> resolve(item, productsById.get(item.getProductId())))
                        .toList();
        var calculation =
                pricing.calculate(
                        rawItems.stream()
                                .filter(item -> canPurchase(item))
                                .map(
                                        item ->
                                                new PricingCalculator.LineInput(
                                                        item.item().getProductId(),
                                                        item.product().unitPrice(),
                                                        item.item().getQuantity()))
                                .toList(),
                        0L,
                        0L);
        Map<Long, Long> grossByProduct =
                calculation.lines().stream()
                        .collect(
                                Collectors.toMap(
                                        PricingCalculator.PricedLine::productId,
                                        PricingCalculator.PricedLine::grossAmount));
        List<ResolvedCartItem> pricedItems =
                rawItems.stream()
                        .map(
                                item ->
                                        new ResolvedCartItem(
                                                item.item(),
                                                item.product(),
                                                grossByProduct.getOrDefault(
                                                        item.item().getProductId(), 0L)))
                        .toList();
        return new ResolvedCart(pricedItems, calculation.subtotal());
    }

    private boolean canPurchase(ResolvedCartItem item) {
        return item.product().purchasable()
                && item.product().availableQuantity() >= item.item().getQuantity();
    }

    private ResolvedCartItem resolve(CartItem item, CatalogProductReadService.ProductView product) {
        if (product == null) {
            throw new IllegalStateException("Cart item references missing product");
        }
        return new ResolvedCartItem(item, product, 0L);
    }

    private CartItemDto toCartItemDto(ResolvedCartItem resolved) {
        CartItem item = resolved.item();
        var product = resolved.product();
        return new CartItemDto(
                item.getCartItemId(),
                item.getProductId(),
                item.getQuantity(),
                product.productName(),
                product.imageUrl(),
                product.imageUrl(),
                product.sku(),
                product.unitPrice(),
                resolved.lineTotal(),
                product.availableQuantity(),
                canPurchase(resolved),
                !"ACTIVE".equals(product.status())
                        ? "PRODUCT_NOT_AVAILABLE"
                        : canPurchase(resolved) ? null : "INVENTORY_INSUFFICIENT_STOCK");
    }

    private CheckoutCartView.Item toCheckoutItem(ResolvedCartItem resolved) {
        CartItem item = resolved.item();
        var product = resolved.product();
        return new CheckoutCartView.Item(
                item.getProductId(),
                item.getQuantity(),
                product.productName(),
                product.imageUrl(),
                product.sku(),
                product.unitPrice(),
                resolved.lineTotal(),
                product.availableQuantity(),
                product.purchasable());
    }

    private record ResolvedCart(List<ResolvedCartItem> items, Long subtotal) {
        private ResolvedCart {
            items = List.copyOf(items);
        }
    }

    private record ResolvedCartItem(
            CartItem item, CatalogProductReadService.ProductView product, Long lineTotal) {}
}
