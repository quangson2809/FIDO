package com.fido.modules.cart.service;

import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.dto.response.CartItemDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.inventory.service.InventoryAvailabilityService;
import com.fido.modules.pricing.PricingCalculator;
import com.fido.modules.pricing.PricingService;
import com.fido.modules.product.service.CatalogProductReadService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CartQueryService {
    private static final String OPEN = "OPEN";

    private final CartRepository carts;
    private final CartItemRepository items;
    private final CatalogProductReadService catalog;
    private final InventoryAvailabilityService inventory;
    private final PricingService pricing;

    public CartQueryService(
            CartRepository carts,
            CartItemRepository items,
            CatalogProductReadService catalog,
            InventoryAvailabilityService inventory,
            PricingService pricing) {
        this.carts = carts;
        this.items = items;
        this.catalog = catalog;
        this.inventory = inventory;
        this.pricing = pricing;
    }

    public CartDto current(Long accountId) {
        Cart cart = currentOpen(accountId);
        return cart == null ? emptyCart(accountId) : toDto(cart);
    }

    public CheckoutCartView checkoutView(Long accountId) {
        Cart cart = currentOpen(accountId);
        return cart == null
                ? new CheckoutCartView(null, List.of(), 0L)
                : toCheckoutView(cart);
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

    private Cart currentOpen(Long accountId) {
        return selectSoleOpen(
                carts.findAllByAccountIdAndStatusOrderByCartIdAsc(accountId, OPEN));
    }

    static Cart selectSoleOpen(List<Cart> openCarts) {
        if (openCarts.size() > 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "CART_SELECTION_AMBIGUOUS");
        }
        return openCarts.isEmpty() ? null : openCarts.get(0);
    }

    private CheckoutCartView toCheckoutView(Cart cart) {
        ResolvedCart resolved = resolveCart(cart);
        return new CheckoutCartView(
                cart.getCartId(),
                resolved.items().stream().map(this::toCheckoutItem).toList(),
                resolved.subtotal());
    }

    private ResolvedCart resolveCart(Cart cart) {
        List<CartItem> cartItems = items.findAllByCartIdOrderByCartItemIdAsc(cart.getCartId());
        List<Long> productIds = cartItems.stream()
                .map(CartItem::getProductId)
                .distinct()
                .toList();
        Map<Long, CatalogProductReadService.ProductView> productsById = catalog.getAll(productIds);
        Map<Long, Integer> stockById = inventory.availableQuantities(productIds);

        List<ResolvedCartItem> rawItems = cartItems.stream()
                .map(item -> resolve(
                        item,
                        productsById.get(item.getProductId()),
                        stockById.getOrDefault(item.getProductId(), 0)))
                .toList();
        var calculation = pricing.calculate(
                rawItems.stream()
                        .map(item -> new PricingCalculator.LineInput(
                                item.item().getProductId(),
                                item.product().unitPrice(),
                                item.item().getQuantity()))
                        .toList(),
                0L,
                0L);
        Map<Long, Long> grossByProduct = calculation.lines().stream()
                .collect(Collectors.toMap(
                        PricingCalculator.PricedLine::productId,
                        PricingCalculator.PricedLine::grossAmount));
        List<ResolvedCartItem> pricedItems = rawItems.stream()
                .map(item -> new ResolvedCartItem(
                        item.item(),
                        item.product(),
                        grossByProduct.get(item.item().getProductId()),
                        item.availableQuantity(),
                        item.purchasable()))
                .toList();
        return new ResolvedCart(pricedItems, calculation.subtotal());
    }

    private ResolvedCartItem resolve(
            CartItem item,
            CatalogProductReadService.ProductView product,
            Integer availableQuantity) {
        if (product == null) {
            throw new IllegalStateException("Cart item references missing product");
        }
        int available = availableQuantity == null ? 0 : availableQuantity;
        boolean purchasable = "ACTIVE".equals(product.status()) && available > 0;
        return new ResolvedCartItem(item, product, 0L, available, purchasable);
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
                resolved.availableQuantity());
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
                resolved.availableQuantity(),
                resolved.purchasable());
    }

    private record ResolvedCart(List<ResolvedCartItem> items, Long subtotal) {
        private ResolvedCart {
            items = List.copyOf(items);
        }
    }

    private record ResolvedCartItem(
            CartItem item,
            CatalogProductReadService.ProductView product,
            Long lineTotal,
            Integer availableQuantity,
            boolean purchasable) {}
}
