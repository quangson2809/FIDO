import { getApiErrorMessage } from './apiError';

// Khách hàng và quản trị cùng dùng thông báo công khai, không hiển thị lỗi gốc.
export const getStorefrontErrorMessage = getApiErrorMessage;
