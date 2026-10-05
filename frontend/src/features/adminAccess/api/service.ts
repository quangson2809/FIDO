import { apiClient } from '../../../services/http/apiClient';
import type { ApiListResponse, ApiResponse } from '../../../types/api';
import type {
  AccessControlDto,
  AuditLogDto,
  AuditQuery,
  CustomerDetailDto,
  CustomerSummaryDto,
  StaffAccountDetailDto,
  StaffAccountSummaryDto,
} from '../types';

export const adminAccessService = {
  async getCustomers(query?: { q?: string; page?: number; page_size?: number }): Promise<ApiListResponse<CustomerSummaryDto>> {
    return apiClient.get<ApiListResponse<CustomerSummaryDto>, ApiListResponse<CustomerSummaryDto>>(
      '/admin/customers',
      { params: query },
    );
  },

  async getCustomer(customerId: number): Promise<CustomerDetailDto> {
    const response = await apiClient.get<ApiResponse<CustomerDetailDto>, ApiResponse<CustomerDetailDto>>(
      `/admin/customers/${customerId}`,
    );
    return response.data;
  },

  async getStaff(query?: { q?: string; role_id?: number; page?: number; page_size?: number }): Promise<ApiListResponse<StaffAccountSummaryDto>> {
    return apiClient.get<ApiListResponse<StaffAccountSummaryDto>, ApiListResponse<StaffAccountSummaryDto>>(
      '/admin/staff-accounts',
      { params: query },
    );
  },

  async getStaffDetail(accountId: number): Promise<StaffAccountDetailDto> {
    const response = await apiClient.get<ApiResponse<StaffAccountDetailDto>, ApiResponse<StaffAccountDetailDto>>(
      `/admin/staff-accounts/${accountId}`,
    );
    return response.data;
  },

  async getAccessControl(): Promise<AccessControlDto> {
    const response = await apiClient.get<ApiResponse<AccessControlDto>, ApiResponse<AccessControlDto>>(
      '/admin/access-control',
    );
    return response.data;
  },

  async getAuditLogs(query?: AuditQuery): Promise<ApiListResponse<AuditLogDto>> {
    return apiClient.get<ApiListResponse<AuditLogDto>, ApiListResponse<AuditLogDto>>(
      '/admin/audit-logs',
      { params: query },
    );
  },
};
