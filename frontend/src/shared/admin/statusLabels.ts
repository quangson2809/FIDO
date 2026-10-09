import type { OrderStatus, PaymentStatus } from '../../features/orders/types';
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị', SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất', DELIVERY_FAILED: 'Giao thất bại', CANCELLED: 'Đã hủy', RETURNED: 'Đã trả hàng',
};
export const paymentStatusLabels: Record<PaymentStatus, string> = { UNPAID: 'Chưa thu tiền', PAID: 'Đã thu tiền', REFUNDED: 'Đã hoàn tiền' };
const labels: Record<string, string> = {
  ...orderStatusLabels, ...paymentStatusLabels, ON_SALE: 'Đang bán', STOPPED: 'Ngừng bán', ACTIVE: 'Đang sử dụng', INACTIVE: 'Ngừng sử dụng', DRAFT: 'Bản nháp',
  RECEIPT_IN: 'Nhập hàng', ADJUSTMENT_IN: 'Điều chỉnh tăng', ADJUSTMENT_OUT: 'Điều chỉnh giảm', ORDER_CONFIRM_OUT: 'Xuất theo đơn', ORDER_CANCEL_IN: 'Hoàn kho do hủy đơn', DELIVERY_RETURN_IN: 'Nhận lại hàng giao thất bại',
};
export const statusLabel = (status: string): string => labels[status] ?? status;
