import { OrderCustomerDetailDto, OrderSummaryDto } from '../../../mocks/apiData';

export type { OrderCustomerDetailDto, OrderSummaryDto };

export interface OrderService {
  getOrders(): Promise<OrderSummaryDto[]>;
  getOrderById(orderId: number): Promise<OrderCustomerDetailDto>;
}
