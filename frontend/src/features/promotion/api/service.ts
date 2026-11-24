import { apiClient } from '../../../services/http/apiClient';
import type { ApiListResponse, ApiResponse } from '../../../types/api';
import type { VoucherDetail, VoucherInput, VoucherPatchInput } from '../types';
import { voucherRequestFields } from '../model/voucherFormModel';
export const voucherService = {
  list: (search: string, page: number) =>
    apiClient.get<ApiListResponse<VoucherDetail>>('/admin/vouchers', {
      params: { search, page, page_size: 20 },
    }),
  async create(input: VoucherInput) {
    return (
      await apiClient.post<ApiResponse<VoucherDetail>>(
        '/admin/vouchers',
        voucherRequestFields(input),
      )
    ).data;
  },
  async update(id: number, input: VoucherPatchInput) {
    const fields = ['code', 'discount_type', 'discount_value', 'minimum_order_value', 'maximum_discount', 'starts_at', 'ends_at', 'usage_limit', 'status'] as const;
    const payload: Record<string, unknown> = {};
    for (const field of fields) if (Object.hasOwn(input, field) && input[field] !== undefined) payload[field] = input[field];
    return (
      await apiClient.patch<ApiResponse<VoucherDetail>>(
        `/admin/vouchers/${id}`,
        payload,
      )
    ).data;
  },
};
