import type { ApiResponse } from '../../../types/api';
import { API_MODE } from '../../../constants/app';
import { apiClient } from '../../../services/http/apiClient';
import type { CartDto, CartService } from '../types';

const mockCart: CartDto = {
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
};

const realCartService: CartService = {
  async getCart() {
    const response = await apiClient.get<ApiResponse<CartDto>, ApiResponse<CartDto>>('/cart');
    return response.data;
  },
};

export const cartService = API_MODE === 'mock'
  ? mockCartService
  : realCartService;
