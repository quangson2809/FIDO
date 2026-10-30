import { apiClient } from '../../../services/http/apiClient';
import { parseAccountResponse, parseAddressResponse } from '../../auth/api/runtimeContract';
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
  async getCustomers(query?: {
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiListResponse<CustomerSummaryDto>> {
    return apiClient.get<ApiListResponse<CustomerSummaryDto>>('/admin/customers', {
      params: query,
    });
  },

  async getCustomer(customerId: number): Promise<CustomerDetailDto> {
    const endpoint = '/admin/customers/' + customerId;
    const response = await apiClient.get<ApiResponse<{
      account: unknown;
      addresses: unknown;
      orders: CustomerDetailDto['orders'];
    }>>(endpoint);
    if (!Array.isArray(response.data.addresses)) {
      throw new TypeError('GET ' + endpoint + ': addresses must be an array');
    }
    return {
      account: parseAccountResponse({ data: response.data.account }, 'GET ' + endpoint),
      addresses: response.data.addresses.map((address) =>
        parseAddressResponse({ data: address }, 'GET ' + endpoint),
      ),
      orders: response.data.orders,
    };
  },

  async getStaff(query?: {
    q?: string;
    role_id?: number;
    page?: number;
    page_size?: number;
  }): Promise<ApiListResponse<StaffAccountSummaryDto>> {
    const endpoint = '/admin/staff-accounts';
    const response = await apiClient.get<ApiListResponse<{
      account: unknown;
      roles: StaffAccountSummaryDto['roles'];
    }>>(endpoint, { params: query });
    return {
      ...response,
      data: response.data.map((member) => ({
        ...member,
        account: parseAccountResponse({ data: member.account }, 'GET ' + endpoint),
      })),
    };
  },

  async getStaffDetail(accountId: number): Promise<StaffAccountDetailDto> {
    const endpoint = '/admin/staff-accounts/' + accountId;
    const response = await apiClient.get<ApiResponse<Omit<StaffAccountDetailDto, 'account'> & { account: unknown }>>(endpoint);
    return {
      ...response.data,
      account: parseAccountResponse({ data: response.data.account }, 'GET ' + endpoint),
    };
  },

  async createStaff(input: StaffCreateInput): Promise<StaffAccountDetailDto> {
    const endpoint = '/admin/staff-accounts';
    const response = await apiClient.post<ApiResponse<Omit<StaffAccountDetailDto, 'account'> & { account: unknown }>>(endpoint, input);
    return {
      ...response.data,
      account: parseAccountResponse({ data: response.data.account }, 'POST ' + endpoint),
    };
  },

  async updateStaff(accountId: number, input: StaffPatchInput): Promise<StaffAccountDetailDto> {
    const endpoint = '/admin/staff-accounts/' + accountId;
    const response = await apiClient.patch<ApiResponse<Omit<StaffAccountDetailDto, 'account'> & { account: unknown }>>(endpoint, input);
    return {
      ...response.data,
      account: parseAccountResponse({ data: response.data.account }, 'PATCH ' + endpoint),
    };
  },

  async getAccessControl(): Promise<AccessControlDto> {
    const response = await apiClient.get<ApiResponse<AccessControlDto>>('/admin/access-control');
    return response.data;
  },

  async getPermissions(): Promise<PermissionDto[]> {
    const response = await apiClient.get<ApiResponse<PermissionDto[]>>('/admin/permissions');
    return response.data;
  },

  async createRole(input: RoleCreateInput): Promise<RoleDetailDto> {
    const response = await apiClient.post<ApiResponse<RoleDetailDto>>('/admin/roles', input);
    return response.data;
  },

  async updateRole(roleId: number, input: RolePatchInput): Promise<RoleDetailDto> {
    const response = await apiClient.patch<ApiResponse<RoleDetailDto>>(
      `/admin/roles/${roleId}`,
      input,
    );
    return response.data;
  },

  async deleteRole(roleId: number): Promise<void> {
    await apiClient.delete<void>(`/admin/roles/${roleId}`);
  },

  async createPermission(input: PermissionCreateInput): Promise<PermissionDto> {
    const response = await apiClient.post<ApiResponse<PermissionDto>>('/admin/permissions', input);
    return response.data;
  },

  async updatePermission(
    permissionId: number,
    input: PermissionPatchInput,
  ): Promise<PermissionDto> {
    const response = await apiClient.patch<ApiResponse<PermissionDto>>(
      `/admin/permissions/${permissionId}`,
      input,
    );
    return response.data;
  },

  async deletePermission(permissionId: number): Promise<void> {
    await apiClient.delete<void>(`/admin/permissions/${permissionId}`);
  },

  async getAuditLogs(query?: AuditQuery): Promise<ApiListResponse<AuditLogDto>> {
    return apiClient.get<ApiListResponse<AuditLogDto>>('/admin/audit-logs', { params: query });
  },
};
