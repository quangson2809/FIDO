package com.fido.modules.cart.service;

import com.fido.modules.account.service.AccountMutationLockService;
import com.fido.modules.cart.dto.request.CartItemCreateRequest;
import com.fido.modules.cart.dto.request.CartItemQuantityRequest;
import com.fido.modules.cart.dto.response.CartDto;
import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.product.service.CatalogProductReadService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@Transactional
public class CartCommandService {

    private final AccountMutationLockService accountLocks;
    private final CartRepository carts;
    private final CartItemRepository items;
    private final CatalogProductReadService catalog;
    private final CartQueryService query;

    public CartCommandService(
            AccountMutationLockService accountLocks,
            CartRepository carts,
            CartItemRepository items,
            CatalogProductReadService catalog,
            CartQueryService query) {
        this.accountLocks = accountLocks;
        this.carts = carts;
        this.items = items;
        this.catalog = catalog;
        this.query = query;
    }

    public CartDto add(Long accountId, CartItemCreateRequest request) {
        Cart cart = currentOrCreate(accountId);
        requirePurchasable(request.product_id());

        CartItem item =
                items.findByCartIdAndProductId(cart.getCartId(), request.product_id())
                        .orElseGet(
                                () -> {
                                    CartItem created = new CartItem();
                                    created.setCartId(cart.getCartId());
                                    created.setProductId(request.product_id());
                                    created.setQuantity(0);
                                    return created;
                                });

        try {
            item.setQuantity(Math.addExact(item.getQuantity(), request.quantity()));
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        items.save(item);
        touch(cart);
        return query.toDto(cart);
    }

    public CartDto updateQuantity(
            Long accountId, Long cartItemId, CartItemQuantityRequest request) {
        Cart cart = currentOrCreate(accountId);
        CartItem item = ownedItem(cart.getCartId(), cartItemId);
        requirePurchasable(item.getProductId());
        item.setQuantity(request.quantity());
        items.save(item);
        touch(cart);
        return query.toDto(cart);
    }

    public CartDto deleteItem(Long accountId, Long cartItemId) {
        Cart cart = currentOrCreate(accountId);
        CartItem item = ownedItem(cart.getCartId(), cartItemId);
        items.delete(item);
        touch(cart);
        return query.toDto(cart);
    }

    public CartDto clear(Long accountId) {
        Cart cart = currentOrCreate(accountId);
        items.deleteByCartId(cart.getCartId());
        touch(cart);
        return query.toDto(cart);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void lockForCheckout(Long accountId) {
        currentOrCreate(accountId);
    }

    private void requirePurchasable(Long productId) {
        if (!catalog.get(productId).purchasable()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Product is not purchasable");
        }
    }

    private Cart currentOrCreate(Long accountId) {
        accountLocks.lock(accountId);
        return carts.findFirstForUpdateByAccountIdOrderByUpdatedAtDescCartIdDesc(accountId)
                .orElseGet(
                        () -> {
                            Cart cart = new Cart();
                            cart.setAccountId(accountId);
                            return carts.save(cart);
                        });
    }

    private CartItem ownedItem(Long cartId, Long cartItemId) {
        return items.findByCartItemIdAndCartId(cartItemId, cartId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private void touch(Cart cart) {
        cart.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        carts.save(cart);
    }
}
