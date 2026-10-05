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

export interface AuditLogDto {
  audit_id: number;
  actor_account_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  description: string | null;
  created_at: string;
}

export interface PageResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuditQuery {
  actor_account_id?: number;
  action?: string;
  target_type?: string;
  target_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}
