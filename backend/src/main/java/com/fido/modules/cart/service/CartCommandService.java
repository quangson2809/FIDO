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
        Cart cart = currentOpenForMutation(accountId);
        requireActiveProduct(request.product_id());

        // Giỏ ghi nhận số lượng muốn mua, chưa giữ/trừ kho; checkout sẽ kiểm tra lại tồn thực tế.
        if (cart == null) {
            cart = new Cart();
            cart.setAccountId(accountId);
            cart.setStatus("OPEN");
            cart = carts.save(cart);
        }

        final Cart activeCart = cart;
        CartItem item =
                items.findByCartIdAndProductId(activeCart.getCartId(), request.product_id())
                        .orElseGet(
                                () -> {
                                    CartItem created = new CartItem();
                                    created.setCartId(activeCart.getCartId());
                                    created.setProductId(request.product_id());
                                    created.setQuantity(0);
                                    return created;
                                });

        try {
            item.setQuantity(Math.addExact(item.getQuantity(), request.quantity()));
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        }
        items.save(item);
        touch(activeCart);
        return query.toDto(activeCart);
    }

    public CartDto updateQuantity(
            Long accountId, Long cartItemId, CartItemQuantityRequest request) {
        Cart cart = currentOpenForMutation(accountId);
        if (cart == null) {
            throw cartItemNotFound();
        }

        CartItem item = ownedItem(cart.getCartId(), cartItemId);
        requireActiveProduct(item.getProductId());
        item.setQuantity(request.quantity());
        items.save(item);
        touch(cart);
        return query.toDto(cart);
    }

    public CartDto deleteItem(Long accountId, Long cartItemId) {
        Cart cart = currentOpenForMutation(accountId);
        if (cart == null) {
            throw cartItemNotFound();
        }

        CartItem item = ownedItem(cart.getCartId(), cartItemId);
        items.delete(item);
        touch(cart);
        return query.toDto(cart);
    }

    public CartDto clear(Long accountId) {
        Cart cart = currentOpenForMutation(accountId);
        if (cart == null) {
            return query.emptyCart(accountId);
        }

        items.deleteByCartId(cart.getCartId());
        touch(cart);
        return query.toDto(cart);
    }

    /** Hoàn tất giỏ trong cùng giao dịch tạo đơn để không mất giỏ khi lưu đơn thất bại. */
    public void completeForOrder(Long accountId) {
        Cart cart = currentOpenForMutation(accountId);
        if (cart == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CART_EMPTY");
        }
        items.deleteByCartId(cart.getCartId());
        cart.setStatus("COMPLETED");
        touch(cart);
    }

    /** Khóa giỏ trong giao dịch checkout để chặn sửa đồng thời; không tạo giỏ mới ở bước này. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockForCheckout(Long accountId) {
        currentOpenForMutation(accountId);
    }

    /**
     * accountId do controller lấy từ JWT; khóa tài khoản trước cả khi chưa tồn tại giỏ.
     * Chỉ chấp nhận không có hoặc đúng một giỏ OPEN, không tự chọn/ghép khi DB có nhiều giỏ.
     */
    private Cart currentOpenForMutation(Long accountId) {
        accountLocks.lock(accountId);
        return CartQueryService.selectSoleOpen(carts.findOpenForUpdateByAccountId(accountId));
    }

    private void requireActiveProduct(Long productId) {
        CatalogProductReadService.ProductView product;
        try {
            product = catalog.get(productId);
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "PRODUCT_NOT_AVAILABLE");
            }
            throw exception;
        }

        if (!"ACTIVE".equals(product.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PRODUCT_NOT_AVAILABLE");
        }
    }

    private CartItem ownedItem(Long cartId, Long cartItemId) {
        return items.findByCartItemIdAndCartId(cartItemId, cartId)
                .orElseThrow(CartCommandService::cartItemNotFound);
    }

    private static ResponseStatusException cartItemNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND");
    }

    private void touch(Cart cart) {
        cart.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        carts.save(cart);
    }
}
