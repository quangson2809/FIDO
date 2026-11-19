import { normalizeApiError } from './apiError';

// Chuyển các mã công khai của backend thành hướng dẫn cho khách; không hiển thị mã lỗi thô.
const customerErrorMessages: Readonly<Record<string, string>> = {
  INVALID_CREDENTIALS: 'Số điện thoại hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.',
  ACCOUNT_NOT_ACTIVE: 'Tài khoản hiện không thể sử dụng. Vui lòng liên hệ hỗ trợ.',
  PHONE_ALREADY_IN_USE: 'Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng số khác.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.',
  CART_ITEM_NOT_FOUND: 'Sản phẩm không còn trong giỏ hàng. Vui lòng tải lại giỏ hàng.',
  PRODUCT_NOT_AVAILABLE: 'Sản phẩm hiện không thể mua. Vui lòng chọn sản phẩm khác.',
  CONFLICT: 'Dữ liệu đã thay đổi hoặc thao tác chưa phù hợp. Vui lòng kiểm tra lại trước khi tiếp tục.',
};

export function getStorefrontErrorMessage(error: unknown, fallback: string): string {
  const { status, message, code } = normalizeApiError(error);
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
  if (status === 403 && code === 'ACCOUNT_NOT_ACTIVE') return customerErrorMessages.ACCOUNT_NOT_ACTIVE;
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy nội dung yêu cầu.';
  if (!status || status >= 500) return fallback;

  const errorCode = code ?? message.trim();
  if (Object.hasOwn(customerErrorMessages, errorCode)) return customerErrorMessages[errorCode];
  if (
    /exception|stack|\bat\s+\w+\.|sql|java\.|\bAPI\b|\bHTTP\b|backend|frontend|metadata|payload|\/api\/|https?:\/\/|Internal Server|Bad Request|Network Error/i.test(
      message,
    ) ||
    /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b[a-z]+(?:_[a-z]+)+\b|^\s*[[{]/.test(message)
  )
    return fallback;
  return message && !/^Yêu cầu API/.test(message) ? message : fallback;
}
