package com.fido.modules.cart.service;

import com.fido.common.response.Pagination;
import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.dto.response.CartItemDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.product.service.CatalogProductReadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    public CartQueryService(CartRepository carts, CartItemRepository items, CatalogProductReadService catalog) {
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
        return carts.findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .map(this::toDto)
                .orElseGet(() -> new CartDto(null, accountId, List.of(), 0L, null, null));
    }

    public CheckoutCartView checkoutView(Long accountId) {
        return carts.findFirstByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .map(this::toCheckoutView)
                .orElseGet(() -> new CheckoutCartView(null, List.of(), 0L));
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
        List<ResolvedCartItem> rawItems = cartItems.stream()
                .map(item -> resolve(item, productsById.get(item.getProductId())))
                .toList();
        var calculation = pricing.calculate(
                rawItems.stream()
                        .map(item -> new PricingCalculator.LineInput(
                                item.item().getProductId(), item.product().unitPrice(), item.item().getQuantity()))
                        .toList(),
                0L,
                0L);
        Map<Long, Long> grossByProduct = calculation.lines().stream()
                .collect(Collectors.toMap(PricingCalculator.PricedLine::productId,
                        PricingCalculator.PricedLine::grossAmount));
        List<ResolvedCartItem> pricedItems = rawItems.stream()
                .map(item -> new ResolvedCartItem(
                        item.item(), item.product(), grossByProduct.get(item.item().getProductId())))
                .toList();
        return new ResolvedCart(pricedItems, calculation.subtotal());
    }

    private ResolvedCartItem resolve(CartItem item, CatalogProductReadService.ProductView product) {
        if (product == null) throw new IllegalStateException("Cart item references missing product");
        return new ResolvedCartItem(item, product, 0L);
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

    private record ResolvedCart(List<ResolvedCartItem> items, Long subtotal) {
        private ResolvedCart { items = List.copyOf(items); }
    }

    private record ResolvedCartItem(
            CartItem item, CatalogProductReadService.ProductView product, Long lineTotal) {}
}
