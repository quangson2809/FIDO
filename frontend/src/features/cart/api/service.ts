import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type { CartDto, CartService } from '../types';

export const cartService: CartService = {
  async getCart() {
    const response = await apiClient.get<ApiResponse<CartDto>>('/cart');
    return response.data;
  },

  async addItem(productId, quantity) {
    const response = await apiClient.post<ApiResponse<CartDto>>('/cart/items', {
      product_id: productId,
      quantity,
    });
    return response.data;
  },

  async updateItem(cartItemId, quantity) {
    const response = await apiClient.patch<ApiResponse<CartDto>>(`/cart/items/${cartItemId}`, {
      quantity,
    });
    return response.data;
  },

  async removeItem(cartItemId) {
    const response = await apiClient.delete<ApiResponse<CartDto>>(
      `/cart/items/${cartItemId}`,
    );
    return response.data;
  },

  async clear() {
    const response = await apiClient.delete<ApiResponse<CartDto>>('/cart');
    return response.data;
  },
};
