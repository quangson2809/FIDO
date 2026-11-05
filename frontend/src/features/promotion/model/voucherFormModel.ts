import type { VoucherInput, VoucherStatus } from '../types';

// Project request fields explicitly so response metadata never reaches strict DTOs.
export const voucherRequestFields = (form: VoucherInput): VoucherInput => ({
  code: form.code,
  discount_type: form.discount_type,
  discount_value: form.discount_value,
  minimum_order_value: form.minimum_order_value,
  maximum_discount: form.maximum_discount,
  starts_at: form.starts_at,
  ends_at: form.ends_at,
  usage_limit: form.usage_limit,
});

export const voucherSubmission = (form: VoucherInput): VoucherInput => ({
  ...voucherRequestFields(form),
  code: form.code.trim(),
});

export const voucherStatusOptions: Record<VoucherStatus, VoucherStatus[]> = {
  DRAFT: ['DRAFT', 'ACTIVE', 'INACTIVE'],
  ACTIVE: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
  INACTIVE: ['INACTIVE', 'ACTIVE', 'EXPIRED'],
  EXPIRED: ['EXPIRED'],
};
export const voucherStatusLabel: Record<VoucherStatus, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  EXPIRED: 'Hết hạn',
};
