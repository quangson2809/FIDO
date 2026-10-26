import type { OrderStatus, PaymentStatus } from '../../features/orders/types';
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  DELIVERY_FAILED: 'Giao thất bại',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thu tiền',
  PAID: 'Đã thu tiền',
  REFUNDED: 'Đã hoàn tiền',
};
const labels: Record<string, string> = {
  ...orderStatusLabels,
  ...paymentStatusLabels,
  ON_SALE: 'Đang bán',
  STOPPED: 'Ngừng bán',
  ACTIVE: 'Đang sử dụng',
  INACTIVE: 'Ngừng sử dụng',
  DRAFT: 'Bản nháp',
  OPENING: 'Tồn đầu kỳ',
  GOODS_RECEIPT: 'Nhập hàng',
  ADJUSTMENT: 'Điều chỉnh tồn kho',
  ORDER: 'Xuất theo đơn',
  ORDER_CANCEL_REVERSAL: 'Hoàn kho do hủy đơn',
  RETURN_RESTOCK: 'Nhận lại hàng trả về',
};
export const statusLabel = (status: string): string => labels[status] ?? status;
