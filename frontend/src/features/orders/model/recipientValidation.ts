import type { CheckoutRequest } from '../types';

// Mirror server constraints for early feedback; the API remains the source of validation.
export function recipientErrors(request: CheckoutRequest) {
  return {
    name: !request.recipient_name.trim()
      ? 'Nhập họ tên người nhận.'
      : request.recipient_name.length > 150
        ? 'Họ tên tối đa 150 ký tự.'
        : null,
    phone: !request.recipient_phone.trim()
      ? 'Nhập số điện thoại người nhận.'
      : request.recipient_phone.length > 20 ||
          !/^\+?[0-9][0-9 ()-]*$/.test(request.recipient_phone)
        ? 'Dùng chữ số, dấu +, dấu cách hoặc dấu gạch nối cho số điện thoại.'
        : null,
    province: !request.province.trim()
      ? 'Nhập tỉnh/thành phố.'
      : request.province.length > 120
        ? 'Tỉnh/thành phố tối đa 120 ký tự.'
        : null,
    district: !request.district.trim()
      ? 'Nhập quận/huyện.'
      : request.district.length > 120
        ? 'Quận/huyện tối đa 120 ký tự.'
        : null,
    ward: !request.ward.trim()
      ? 'Nhập phường/xã.'
      : request.ward.length > 120
        ? 'Phường/xã tối đa 120 ký tự.'
        : null,
    addressLine: !request.address_line.trim()
      ? 'Nhập địa chỉ cụ thể.'
      : request.address_line.length > 500
        ? 'Địa chỉ cụ thể tối đa 500 ký tự.'
        : null,
  };
}
