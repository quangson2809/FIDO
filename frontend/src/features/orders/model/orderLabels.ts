import type { OrderStatus, PaymentStatus } from '../types';
export const customerOrderLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  DELIVERY_FAILED: 'Giao thất bại',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};
export const customerPaymentLabels: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};
