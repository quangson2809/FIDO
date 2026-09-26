import { OrderService, OrderCustomerDetailDto, OrderSummaryDto } from '../types';
import { mockOrderDetails, mockOrderSummaries } from '../../../mocks/apiData';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockOrderService: OrderService = {
  async getOrders() {
    return mockOrderSummaries;
  },
  async getOrderById(orderId) {
    const order = mockOrderDetails.find((item) => item.order_id === orderId);
    if (!order) throw new Error(`Mock order ${orderId} not found`);
    return order;
  },
};

const realOrderService: OrderService = {
  async getOrders() {
    const response = await apiClient.get<{ data: OrderSummaryDto[] }, { data: OrderSummaryDto[] }>('/me/orders');
    return response.data;
  },
  async getOrderById(orderId) {
    const response = await apiClient.get<{ data: OrderCustomerDetailDto }, { data: OrderCustomerDetailDto }>(`/me/orders/${orderId}`);
    return response.data;
  },
};

export const orderService = API_MODE === 'mock' ? mockOrderService : realOrderService;
