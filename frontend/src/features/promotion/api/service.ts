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
    return (
      await apiClient.patch<ApiResponse<VoucherDetail>>(
        `/admin/vouchers/${id}`,
        { ...voucherRequestFields(input), status: input.status },
      )
    ).data;
  },
};
