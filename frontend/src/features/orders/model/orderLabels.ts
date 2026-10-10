import type { OrderStatus, PaymentStatus } from '../types';
export const customerOrderLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị', SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất', DELIVERY_FAILED: 'Giao thất bại', CANCELLED: 'Đã hủy', RETURNED: 'Đã trả hàng',
};
export const customerPaymentLabels: Record<PaymentStatus, string> = { UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền' };
export const customerOrderNotes: Record<OrderStatus, string> = {
  PENDING: 'Đơn đã được ghi nhận và đang chờ xác nhận.', CONFIRMED: 'Đơn đã được xác nhận.', PREPARING: 'Sản phẩm đang được chuẩn bị để giao.', SHIPPING: 'Đơn hàng đang được giao tới người nhận.',
  COMPLETED: 'Đơn hàng đã hoàn tất.', DELIVERY_FAILED: 'Lần giao hàng chưa thành công. Theo dõi đơn để xem cập nhật tiếp theo.', CANCELLED: 'Đơn hàng đã được hủy.', RETURNED: 'Đơn hàng đã được trả lại. Xem trạng thái thanh toán để theo dõi hoàn tiền.',
};
