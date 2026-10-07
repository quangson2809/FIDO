import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { API_MODE } from '../../../constants/app';
import { apiClient } from '../../../services/http/apiClient';
import type {
  OrderCustomerDetailDto,
  OrderListQuery,
  OrderPage,
  OrderService,
  OrderSummaryDto,
  RecipientPatchInput,
} from '../types';

const emptyOrderPage: OrderPage = {
  items: [],
  meta: { page: 1, page_size: 20, total: 0, total_pages: 0 },
};

const mockOrderService: OrderService = {
  async getOrders() {
    return emptyOrderPage;
  },
  async getOrder(orderId) {
    throw new Error(`Mock order ${orderId} is not configured`);
  },
  async updateRecipient(orderId) {
    throw new Error(`Mock order ${orderId} is not configured`);
  },
};

const realOrderService: OrderService = {
  async getOrders(query: OrderListQuery = {}) {
    const response = await apiClient.get<ApiListResponse<OrderSummaryDto>>('/me/orders', { params: query });
    return { items: response.data, meta: response.meta };
  },
  async getOrder(orderId) {
    const response = await apiClient.get<ApiResponse<OrderCustomerDetailDto>>(`/me/orders/${orderId}`);
    return response.data;
  },
  async updateRecipient(orderId, input: RecipientPatchInput) {
    const response = await apiClient.patch<ApiResponse<OrderCustomerDetailDto>>(`/me/orders/${orderId}/recipient`, input);
    return response.data;
  },
};

export const orderService = API_MODE === 'mock'
  ? mockOrderService
  : realOrderService;
