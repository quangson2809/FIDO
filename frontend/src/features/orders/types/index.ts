export interface OrderSummaryDto {
  order_id: number;
  order_code: string;
  order_status: string;
  payment_status: string;
  image_url: string | null;
  total: number;
  created_at: string;
  completed_at: string | null;
  returned_at: string | null;
}

export interface OrderItemDto {
  order_item_id: number;
  variant_id: number;
  product_name: string;
  image_url: string | null;
  sku: string | null;
  size: string;
  color: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface RecipientDto {
  phone: string;
  email: string | null;
  address: string;
}

export interface PaymentPublicDto {
  payment_status: string;
  amount_due: number;
  amount_received: number;
  amount_refunded: number;
}

export interface ShippingInfoDto {
  delivery_mode: string;
  carrier_name: string | null;
}

export interface OrderCustomerDetailDto {
  order_id: number;
  order_code: string;
  order_status: string;
  recipient: RecipientDto;
  items: OrderItemDto[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  payment: PaymentPublicDto;
  shipping_info: ShippingInfoDto | null;
  completed_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderService {
  getOrders(): Promise<OrderSummaryDto[]>;
  getOrder(orderId: number | string): Promise<OrderCustomerDetailDto>;
}
