import type { AccountDto, AddressDto, PermissionDto, RoleDto } from '../auth/types';
import type { OrderSummaryDto } from '../orders/types';
import type { PaginationMeta } from '../../types/api';

export interface CustomerSummaryDto {
  account_id: number;
  phone: string;
  email: string | null;
  order_count: number;
  last_order_at: string | null;
}

export interface CustomerDetailDto {
  account: AccountDto;
  addresses: AddressDto[];
  orders: OrderSummaryDto[];
}

export interface StaffAccountSummaryDto {
  account: AccountDto;
  roles: RoleDto[];
}

export interface StaffAccountDetailDto {
  account: AccountDto;
  roles: RoleDto[];
  permissions: PermissionDto[];
}

export interface RoleDetailDto extends RoleDto {
  permissions: PermissionDto[];
}

export interface AccessControlDto {
  roles: RoleDetailDto[];
  permissions: PermissionDto[];
}

export interface StaffCreateInput {
  full_name: string;
  phone: string;
  email: string | null;
  password: string;
  role_ids: number[];
}

export interface StaffPatchInput {
  phone?: string;
  email?: string;
  role_ids?: number[];
}

export interface RoleCreateInput {
  code: string;
  name: string;
  description?: string | null;
  permission_ids: number[];
}

export interface RolePatchInput {
  name?: string;
  description?: string | null;
  permission_ids?: number[];
}

export interface PermissionCreateInput {
  code: string;
  name: string;
}

export interface PermissionPatchInput {
  name?: string;
}

export interface AuditLogDto {
  id: number;
  actor_account_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  correlation_id: string | null;
  created_at: string;
}

export interface PageResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuditQuery {
  actor_account_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}
