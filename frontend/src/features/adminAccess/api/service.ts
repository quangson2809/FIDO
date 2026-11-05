import { apiClient } from '../../../services/http/apiClient';
import { parseAccountResponse, parseAddressResponse, parseRole, parsePermission } from '../../auth/api/runtimeContract';
import type { ApiListResponse, ApiResponse } from '../../../types/api';
import type { PermissionDto, RoleDto } from '../../auth/types';
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

type WireRole = Omit<RoleDto, 'role_id'> & { id: number };
type WirePermission = Omit<PermissionDto, 'permission_id'> & { id: number };
type WireRoleDetail = WireRole & { permissions: WirePermission[] };
type WireStaffDetail = Omit<StaffAccountDetailDto, 'account' | 'roles' | 'permissions'> & {
  account: unknown; roles: WireRole[]; permissions: WirePermission[];
};
const roleDetail = (role: WireRoleDetail): RoleDetailDto => ({
  ...parseRole(role, 'Admin RBAC', 'role'),
  permissions: role.permissions.map((permission) => parsePermission(permission, 'Admin RBAC', 'permission')),
});
const staffDetail = (member: WireStaffDetail, endpoint: string): StaffAccountDetailDto => ({
  account: parseAccountResponse({ data: member.account }, endpoint),
  roles: member.roles.map((role) => parseRole(role, endpoint, 'role')),
  permissions: member.permissions.map((permission) => parsePermission(permission, endpoint, 'permission')),
});

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
      roles: WireRole[];
    }>>(endpoint, { params: query });
    return {
      ...response,
      data: response.data.map((member) => ({
        ...member,
        account: parseAccountResponse({ data: member.account }, 'GET ' + endpoint),
        roles: member.roles.map((role) => parseRole(role, endpoint, 'role')),
      })),
    };
  },

  async getStaffDetail(accountId: number): Promise<StaffAccountDetailDto> {
    const endpoint = '/admin/staff-accounts/' + accountId;
    const response = await apiClient.get<ApiResponse<WireStaffDetail>>(endpoint);
    return staffDetail(response.data, 'GET ' + endpoint);
  },

  async createStaff(input: StaffCreateInput): Promise<StaffAccountDetailDto> {
    const endpoint = '/admin/staff-accounts';
    const response = await apiClient.post<ApiResponse<WireStaffDetail>>(endpoint, input);
    return staffDetail(response.data, 'POST ' + endpoint);
  },

  async updateStaff(accountId: number, input: StaffPatchInput): Promise<StaffAccountDetailDto> {
    const endpoint = '/admin/staff-accounts/' + accountId;
    const response = await apiClient.patch<ApiResponse<WireStaffDetail>>(endpoint, input);
    return staffDetail(response.data, 'PATCH ' + endpoint);
  },

  async getAccessControl(): Promise<AccessControlDto> {
    const response = await apiClient.get<ApiResponse<{ roles: WireRoleDetail[]; permissions: WirePermission[] }>>('/admin/access-control');
    return {
      roles: response.data.roles.map(roleDetail),
      permissions: response.data.permissions.map((permission) => parsePermission(permission, 'GET /admin/access-control', 'permission')),
    };
  },

  async getPermissions(): Promise<PermissionDto[]> {
    const response = await apiClient.get<ApiResponse<WirePermission[]>>('/admin/permissions');
    return response.data.map((permission) => parsePermission(permission, 'GET /admin/permissions', 'permission'));
  },

  async createRole(input: RoleCreateInput): Promise<RoleDetailDto> {
    const response = await apiClient.post<ApiResponse<WireRoleDetail>>('/admin/roles', input);
    return roleDetail(response.data);
  },

  async updateRole(roleId: number, input: RolePatchInput): Promise<RoleDetailDto> {
    const response = await apiClient.patch<ApiResponse<WireRoleDetail>>(
      `/admin/roles/${roleId}`,
      input,
    );
    return roleDetail(response.data);
  },

  async deleteRole(roleId: number): Promise<void> {
    await apiClient.delete<void>(`/admin/roles/${roleId}`);
  },

  async createPermission(input: PermissionCreateInput): Promise<PermissionDto> {
    const response = await apiClient.post<ApiResponse<WirePermission>>('/admin/permissions', input);
    return parsePermission(response.data, 'POST /admin/permissions', 'permission');
  },

  async updatePermission(
    permissionId: number,
    input: PermissionPatchInput,
  ): Promise<PermissionDto> {
    const response = await apiClient.patch<ApiResponse<WirePermission>>(
      `/admin/permissions/${permissionId}`,
      input,
    );
    return parsePermission(response.data, 'PATCH /admin/permissions', 'permission');
  },

  async deletePermission(permissionId: number): Promise<void> {
    await apiClient.delete<void>(`/admin/permissions/${permissionId}`);
  },

  async getAuditLogs(query?: AuditQuery): Promise<ApiListResponse<AuditLogDto>> {
    return apiClient.get<ApiListResponse<AuditLogDto>>('/admin/audit-logs', { params: query });
  },
};
