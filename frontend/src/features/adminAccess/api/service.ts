import { apiClient } from '../../../services/http/apiClient';
import type { ApiListResponse, ApiResponse } from '../../../types/api';
import type { PermissionDto } from '../../auth/types';
import type {
  AccessControlDto,
  AuditLogDto,
  AuditQuery,
  CustomerDetailDto,
  CustomerSummaryDto,
  PermissionCreateInput,
  PermissionPatchInput,
  RoleCreateInput,
  RoleDetailDto,
  RolePatchInput,
  StaffAccountDetailDto,
  StaffAccountSummaryDto,
  StaffCreateInput,
  StaffPatchInput,
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

  async createStaff(input: StaffCreateInput): Promise<StaffAccountDetailDto> {
    const response = await apiClient.post<ApiResponse<StaffAccountDetailDto>, ApiResponse<StaffAccountDetailDto>>(
      '/admin/staff-accounts',
      input,
    );
    return response.data;
  },

  async updateStaff(accountId: number, input: StaffPatchInput): Promise<StaffAccountDetailDto> {
    const response = await apiClient.patch<ApiResponse<StaffAccountDetailDto>, ApiResponse<StaffAccountDetailDto>>(
      `/admin/staff-accounts/${accountId}`,
      input,
    );
    return response.data;
  },

  async getAccessControl(): Promise<AccessControlDto> {
    const response = await apiClient.get<ApiResponse<AccessControlDto>, ApiResponse<AccessControlDto>>(
      '/admin/access-control',
    );
    return response.data;
  },

  async getPermissions(): Promise<PermissionDto[]> {
    const response = await apiClient.get<ApiResponse<PermissionDto[]>, ApiResponse<PermissionDto[]>>(
      '/admin/permissions',
    );
    return response.data;
  },

  async createRole(input: RoleCreateInput): Promise<RoleDetailDto> {
    const response = await apiClient.post<ApiResponse<RoleDetailDto>, ApiResponse<RoleDetailDto>>(
      '/admin/roles',
      input,
    );
    return response.data;
  },

  async updateRole(roleId: number, input: RolePatchInput): Promise<RoleDetailDto> {
    const response = await apiClient.patch<ApiResponse<RoleDetailDto>, ApiResponse<RoleDetailDto>>(
      `/admin/roles/${roleId}`,
      input,
    );
    return response.data;
  },

  async deleteRole(roleId: number): Promise<void> {
    await apiClient.delete<void, void>(`/admin/roles/${roleId}`);
  },

  async createPermission(input: PermissionCreateInput): Promise<PermissionDto> {
    const response = await apiClient.post<ApiResponse<PermissionDto>, ApiResponse<PermissionDto>>(
      '/admin/permissions',
      input,
    );
    return response.data;
  },

  async updatePermission(permissionId: number, input: PermissionPatchInput): Promise<PermissionDto> {
    const response = await apiClient.patch<ApiResponse<PermissionDto>, ApiResponse<PermissionDto>>(
      `/admin/permissions/${permissionId}`,
      input,
    );
    return response.data;
  },

  async deletePermission(permissionId: number): Promise<void> {
    await apiClient.delete<void, void>(`/admin/permissions/${permissionId}`);
  },

  async getAuditLogs(query?: AuditQuery): Promise<ApiListResponse<AuditLogDto>> {
    return apiClient.get<ApiListResponse<AuditLogDto>, ApiListResponse<AuditLogDto>>(
      '/admin/audit-logs',
      { params: query },
    );
  },
};
