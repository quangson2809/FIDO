import type { CheckoutRequest } from '../types';
// Presentation validation follows the existing DTO lengths; the server still validates the request.
export function recipientErrors(request: Pick<CheckoutRequest, 'recipient_phone' | 'recipient_email' | 'recipient_address'>) {
  return {
    phone: !request.recipient_phone.trim() ? 'Nhập số điện thoại người nhận.'
      : request.recipient_phone.length > 20 || !/^\+?[0-9][0-9 ()-]*$/.test(request.recipient_phone) ? 'Dùng chữ số, dấu +, dấu cách hoặc dấu gạch nối cho số điện thoại.' : null,
    email: request.recipient_email && (request.recipient_email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(request.recipient_email)) ? 'Nhập email hợp lệ, ví dụ ban@example.com.' : null,
    address: !request.recipient_address.trim() ? 'Chọn địa chỉ đã lưu hoặc nhập địa chỉ nhận hàng.' : request.recipient_address.length > 500 ? 'Địa chỉ tối đa 500 ký tự.' : null,
  };
}
export function quoteHasExpired(expiresAt: string | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return !Number.isFinite(expiry) || expiry <= now;
}
