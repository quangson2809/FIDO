import type { ApiListResponse, ApiResponse } from '../../../types/api';
import { API_MODE } from '../../../constants/app';
import { apiClient } from '../../../services/http/apiClient';
import type {
  OrderCustomerDetailDto,
  OrderService,
  OrderSummaryDto,
} from '../types';

const mockOrders: OrderSummaryDto[] = [];

const mockOrderService: OrderService = {
  async getOrders() {
    return mockOrders;
  },
  async getOrder(orderId) {
    throw new Error(`Mock order ${orderId} is not configured`);
  },
};

const realOrderService: OrderService = {
  async getOrders() {
    const response = await apiClient.get<
      ApiListResponse<OrderSummaryDto>,
      ApiListResponse<OrderSummaryDto>
    >('/me/orders');
    return response.data;
  },
  async getOrder(orderId) {
    const response = await apiClient.get<
      ApiResponse<OrderCustomerDetailDto>,
      ApiResponse<OrderCustomerDetailDto>
    >(`/me/orders/${orderId}`);
    return response.data;
  },
};

export const orderService = API_MODE === 'mock'
  ? mockOrderService
  : realOrderService;
