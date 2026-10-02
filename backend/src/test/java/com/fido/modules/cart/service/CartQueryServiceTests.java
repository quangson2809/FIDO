package com.fido.modules.cart.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fido.modules.cart.entity.Cart;
import com.fido.modules.cart.entity.CartItem;
import com.fido.modules.cart.repository.CartItemRepository;
import com.fido.modules.cart.repository.CartRepository;
import com.fido.modules.product.service.CatalogVariantReadService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CartQueryServiceTests {

    @Test
    void cartItemUsesPrimaryImageFromCatalogVariantView() {
        CartRepository carts = mock(CartRepository.class);
        CartItemRepository items = mock(CartItemRepository.class);
        CatalogVariantReadService catalog = mock(CatalogVariantReadService.class);
        CartQueryService service = new CartQueryService(carts, items, catalog);

        Cart cart = new Cart();
        cart.setCartId(1L);
        cart.setAccountId(2L);

        CartItem item = new CartItem();
        item.setCartItemId(3L);
        item.setCartId(1L);
        item.setVariantId(4L);
        item.setQuantity(2);

        var variant = new CatalogVariantReadService.VariantView(
                4L,
                5L,
                "FIDO Shirt",
                "https://example.test/front.png",
                "SKU-4",
                "M",
                "Black",
                new BigDecimal("90000.00"),
                "ON_SALE",
                "ON_SALE",
                5
        );

        when(items.findAllByCartIdOrderByCartItemIdAsc(1L))
                .thenReturn(List.of(item));
        when(catalog.getAll(List.of(4L)))
                .thenReturn(Map.of(4L, variant));

        var dto = service.toDto(cart);

        assertEquals(
                "https://example.test/front.png",
                dto.items().get(0).image()
        );
    }
}
