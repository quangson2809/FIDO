import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  CheckoutQuoteDto,
  CheckoutService,
  OrderConfirmationDto,
} from '../types';

export const checkoutService: CheckoutService = {
  async quote(request) {
    const response = await apiClient.post<ApiResponse<CheckoutQuoteDto>>(
      '/checkout/quote',
      { recipient_name: request.recipient_name, recipient_phone: request.recipient_phone, province: request.province,
        district: request.district, ward: request.ward, address_line: request.address_line, voucher_code: request.voucher_code },
    );
    return response.data;
  },

  async createOrder(request, idempotencyKey) {
    const response = await apiClient.post<ApiResponse<OrderConfirmationDto>>(
      '/orders',
      request,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  },
};
