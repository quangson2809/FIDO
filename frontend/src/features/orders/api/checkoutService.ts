import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  CheckoutQuoteDto,
  CheckoutRequest,
  CheckoutService,
  OrderConfirmationDto,
} from '../types';

export const checkoutService: CheckoutService = {
  async quote(request: CheckoutRequest) {
    const response = await apiClient.post<ApiResponse<CheckoutQuoteDto>>('/checkout/quote', request);
    return response.data;
  },

  async createOrder(request: CheckoutRequest) {
    const response = await apiClient.post<ApiResponse<OrderConfirmationDto>>('/orders', request);
    return response.data;
  },
};
