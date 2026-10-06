import type { ApiResponse } from '../../../types/api';
import { API_MODE } from '../../../constants/app';
import { apiClient } from '../../../services/http/apiClient';
import type { CartDto, CartService } from '../types';

let mockCart: CartDto = {
  cart_id: null,
  account_id: null,
  items: [],
  subtotal: 0,
  created_at: null,
  updated_at: null,
};

const mockCartService: CartService = {
  async getCart() {
    return mockCart;
  },
  async addItem(variantId, quantity) {
    const existing = mockCart.items.find((item) => item.variant_id === variantId);
    const items = existing
      ? mockCart.items.map((item) =>
          item.variant_id === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      : [
          ...mockCart.items,
          {
            cart_item_id: Date.now(),
            variant_id: variantId,
            quantity,
            product_name: `Variant ${variantId}`,
            image_url: null,
            size: '',
            color: '',
            unit_price: 0,
            line_total: 0,
            available_quantity: 0,
          },
        ];
    mockCart = { ...mockCart, items };
    return mockCart;
  },
  async updateItem(cartItemId, quantity) {
    mockCart = {
      ...mockCart,
      items: mockCart.items.map((item) =>
        item.cart_item_id === cartItemId ? { ...item, quantity } : item,
      ),
    };
    return mockCart;
  },
  async removeItem(cartItemId) {
    mockCart = {
      ...mockCart,
      items: mockCart.items.filter((item) => item.cart_item_id !== cartItemId),
    };
    return mockCart;
  },
  async clear() {
    mockCart = { ...mockCart, items: [], subtotal: 0 };
    return mockCart;
  },
};

const realCartService: CartService = {
  async getCart() {
    const response = await apiClient.get<ApiResponse<CartDto>, ApiResponse<CartDto>>('/cart');
    return response.data;
  },
  async addItem(variantId, quantity) {
    const response = await apiClient.post<ApiResponse<CartDto>, ApiResponse<CartDto>>(
      '/cart/items',
      { variant_id: variantId, quantity },
    );
    return response.data;
  },
  async updateItem(cartItemId, quantity) {
    const response = await apiClient.patch<ApiResponse<CartDto>, ApiResponse<CartDto>>(
      `/cart/items/${cartItemId}`,
      { quantity },
    );
    return response.data;
  },
  async removeItem(cartItemId) {
    const response = await apiClient.delete<ApiResponse<CartDto>, ApiResponse<CartDto>>(
      `/cart/items/${cartItemId}`,
    );
    return response.data;
  },
  async clear() {
    const response = await apiClient.delete<ApiResponse<CartDto>, ApiResponse<CartDto>>('/cart');
    return response.data;
  },
};

export const cartService = API_MODE === 'mock'
  ? mockCartService
  : realCartService;
