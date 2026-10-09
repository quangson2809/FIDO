import { apiClient } from '../../../services/http/apiClient';
import type { ApiListResponse, ApiResponse } from '../../../types/api';
import type { VoucherDetail, VoucherInput } from '../types';
import { voucherRequestFields } from '../model/voucherFormModel';
export const voucherService = {
  list: (search: string, page: number) => apiClient.get<ApiListResponse<VoucherDetail>>('/admin/vouchers', { params: { search, page, page_size: 20 } }),
  async create(input: VoucherInput) {
    return (await apiClient.post<ApiResponse<VoucherDetail>>('/admin/vouchers', voucherRequestFields(input))).data;
  },
  async update(id: number, input: VoucherInput) {
    return (await apiClient.put<ApiResponse<VoucherDetail>>(`/admin/vouchers/${id}`, voucherRequestFields(input))).data;
  },
};
