import { CartItemDto, CartService } from '../types';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockCart: CartItemDto[] = [{ product_id: 1, quantity: 2 }];

const mockCartService: CartService = {
  async getCart() { return mockCart; }
};

const realCartService: CartService = {
  async getCart() { return apiClient.get<CartItemDto[], CartItemDto[]>('/cart'); }
};

export const cartService = API_MODE === 'mock' 
  ? mockCartService 
  : realCartService;
