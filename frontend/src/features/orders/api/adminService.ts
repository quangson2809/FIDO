import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import type {
  AdminOrderDetailDto,
  AdminOrderListQuery,
  AdminOrderPatchInput,
  AfterSalesReturnInput,
  OrderActionInput,
  OrderSummaryDto,
  PaymentAction,
  PaymentAdminDto,
} from '../types';

export const adminOrderService = {
  async list(query: AdminOrderListQuery = {}) {
    const response = await apiClient.get<
      ApiListResponse<OrderSummaryDto>,
      ApiListResponse<OrderSummaryDto>
    >('/admin/orders', { params: query });
    return response;
  },

  async get(orderId: number) {
    const response = await apiClient.get<
      ApiResponse<AdminOrderDetailDto>,
      ApiResponse<AdminOrderDetailDto>
    >(`/admin/orders/${orderId}`);
    return response.data;
  },

  async update(orderId: number, input: AdminOrderPatchInput) {
    const response = await apiClient.patch<
      ApiResponse<AdminOrderDetailDto>,
      ApiResponse<AdminOrderDetailDto>
    >(`/admin/orders/${orderId}`, input);
    return response.data;
  },

  async action(orderId: number, input: OrderActionInput) {
    const response = await apiClient.post<
      ApiResponse<AdminOrderDetailDto>,
      ApiResponse<AdminOrderDetailDto>
    >(`/admin/orders/${orderId}/actions`, input);
    return response.data;
  },

  async paymentAction(orderId: number, action: PaymentAction) {
    const response = await apiClient.post<
      ApiResponse<PaymentAdminDto>,
      ApiResponse<PaymentAdminDto>
    >(`/admin/orders/${orderId}/payment-actions`, { action });
    return response.data;
  },

  async returnOrder(orderId: number, input: AfterSalesReturnInput) {
    const response = await apiClient.post<
      ApiResponse<AdminOrderDetailDto>,
      ApiResponse<AdminOrderDetailDto>
    >(`/admin/orders/${orderId}/after-sales`, input);
    return response.data;
  },
};
