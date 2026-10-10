import { normalizeApiError } from './apiError';
// Keep customer feedback free of internal exception messages, including on network errors.
export function getStorefrontErrorMessage(error: unknown, fallback: string): string {
  const { status, message } = normalizeApiError(error);
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 404) return 'Không tìm thấy nội dung yêu cầu.';
  if (!status || status >= 500) return fallback;
  if (/exception|stack|\bat\s+\w+\.|sql|java\.|API|Internal Server|Bad Request|Network Error/i.test(message)) return fallback;
  return message && !/^Yêu cầu API/.test(message) ? message : fallback;
}
