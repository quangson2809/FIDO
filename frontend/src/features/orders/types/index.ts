export interface OrderSummaryDto {
  order_id: number;
  order_code: string;
<<<<<<< HEAD
  total_amount: number;
  status: string;
=======
  order_status: string;
  payment_status: string;
  image_url: string | null;
  total: number;
  created_at: string;
  completed_at: string | null;
  returned_at: string | null;
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
}
export interface OrderService {
  getOrders(): Promise<OrderSummaryDto[]>;
}
