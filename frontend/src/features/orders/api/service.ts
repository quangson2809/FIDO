import { OrderSummaryDto, OrderService } from '../types';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockOrders: OrderSummaryDto[] = [{ order_id: 1, order_code: 'ORD001', total_amount: 1500000, status: 'DELIVERED' }];

const mockOrderService: OrderService = {
  async getOrders() { return mockOrders; }
};

const realOrderService: OrderService = {
  async getOrders() { return apiClient.get<OrderSummaryDto[], OrderSummaryDto[]>('/orders'); }
};

export const orderService = API_MODE === 'mock' 
  ? mockOrderService 
  : realOrderService;
