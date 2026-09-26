export interface OrderSummaryDto {
  order_id: number;
  order_code: string;
  total_amount: number;
  status: string;
}
export interface OrderService {
  getOrders(): Promise<OrderSummaryDto[]>;
}
