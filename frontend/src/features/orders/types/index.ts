import type { PaginationMeta } from '../../../types/api';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'DELIVERY_FAILED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface OrderSummaryDto {
  order_id: number;
  order_code: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
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
  payment_status: PaymentStatus;
  amount_due: number;
  amount_received: number;
  amount_refunded: number;
}

export interface PaymentAdminDto extends PaymentPublicDto {
  collected_by_account_id: number | null;
  collected_at: string | null;
  refunded_by_account_id: number | null;
  refunded_at: string | null;
}

export interface ShippingInfoDto {
  delivery_mode: string;
  carrier_name: string | null;
}

export interface OrderCustomerDetailDto {
  order_id: number;
  order_code: string;
  order_status: OrderStatus;
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

export interface OrderListQuery {
  order_status?: OrderStatus;
  page?: number;
  page_size?: number;
}

export interface OrderPage {
  items: OrderSummaryDto[];
  meta: PaginationMeta;
}

export interface RecipientPatchInput {
  recipient_phone?: string;
  recipient_address?: string;
}

export interface CheckoutRequest {
  recipient_phone: string;
  recipient_email: string | null;
  recipient_address: string;
  voucher_code: string | null;
}

export interface CheckoutItemDto {
  variant_id: number;
  quantity: number;
  product_name: string;
  size: string;
  color: string;
  unit_price: number;
  line_total: number;
  available_quantity: number;
}

export interface VoucherDto {
  voucher_id: number;
  code: string;
}

export interface CheckoutQuoteDto {
  quote_id?: string;
  expires_at?: string;
  items: CheckoutItemDto[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  voucher: VoucherDto | null;
}

export interface OrderConfirmationDto {
  order_id: number;
  order_code: string;
  order_status: OrderStatus;
  payment: PaymentPublicDto;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  recipient: RecipientDto;
  created_at: string;
}

export type AdminOrderAction =
  | 'CONFIRM'
  | 'PREPARE'
  | 'SHIP'
  | 'DELIVERY_FAILED'
  | 'RETRY_DELIVERY'
  | 'CANCEL'
  | 'COMPLETE'
  | 'DELIVERY_RETURN_IN';

export type PaymentAction = 'COLLECT_COD' | 'REFUND';

export interface AdminOrderDetailDto {
  order_id: number;
  order_code: string;
  order_status: OrderStatus;
  recipient: RecipientDto;
  items: OrderItemDto[];
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  shipping_info: ShippingInfoDto | null;
  completed_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
  customer_account_id: number | null;
  voucher_id: number | null;
  customer_service_note: string | null;
  cancel_reason: string | null;
  payment: PaymentAdminDto;
  allowed_actions: AdminOrderAction[];
}

export interface AdminOrderListQuery {
  order_code?: string;
  order_status?: OrderStatus;
  payment_status?: PaymentStatus;
  created_from?: string;
  created_to?: string;
  page?: number;
  page_size?: number;
}

export interface AdminOrderPatchInput {
  recipient_phone?: string;
  recipient_email?: string | null;
  recipient_address?: string;
  customer_service_note?: string | null;
  shipping_info?: {
    delivery_mode: string;
    carrier_name: string | null;
  };
}

export interface OrderActionInput {
  action: AdminOrderAction;
  reason: string | null;
}

export interface AfterSalesReturnInput {
  operation: 'RETURN';
  reason: string;
  source_variant_id?: number;
  target_variant_id?: number;
  quantity?: number;
}

export interface OrderService {
  getOrders(query?: OrderListQuery): Promise<OrderPage>;
  getOrder(orderId: number | string): Promise<OrderCustomerDetailDto>;
  updateRecipient(orderId: number | string, input: RecipientPatchInput): Promise<OrderCustomerDetailDto>;
}

export interface CheckoutService {
  quote(request: CheckoutRequest): Promise<CheckoutQuoteDto>;
  createOrder(request: CheckoutRequest & { quote_id: string }): Promise<OrderConfirmationDto>;
}
