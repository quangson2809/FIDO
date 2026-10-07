import type { MeDto } from '../types';
import { isAdminProfile, isSuperAdminProfile } from './sessionAccess';

export type AdminModuleKey =
  | 'dashboard'
  | 'orders'
  | 'products'
  | 'categories'
  | 'brands'
  | 'sizes'
  | 'colors'
  | 'inventory'
  | 'inward'
  | 'suppliers'
  | 'customers'
  | 'staff'
  | 'roles'
  | 'audit'
  | 'reports'
  | 'content';

type AdminPermissionCode =
  | 'CATALOG_READ'
  | 'INVENTORY_READ'
  | 'ORDER_READ'
  | 'AUDIT_READ'
  | 'CONTENT_READ'
  | 'CUSTOMER_READ';

type AdminWritePermissionCode =
  | 'CATALOG_WRITE'
  | 'INVENTORY_WRITE'
  | 'CONTENT_WRITE';

const readPermissionByModule: Partial<Record<AdminModuleKey, AdminPermissionCode>> = {
  orders: 'ORDER_READ',
  products: 'CATALOG_READ',
  categories: 'CATALOG_READ',
  brands: 'CATALOG_READ',
  sizes: 'CATALOG_READ',
  colors: 'CATALOG_READ',
  inventory: 'INVENTORY_READ',
  inward: 'INVENTORY_READ',
  suppliers: 'INVENTORY_READ',
  customers: 'CUSTOMER_READ',
  audit: 'AUDIT_READ',
  content: 'CONTENT_READ',
};

const writePermissionByModule: Partial<Record<AdminModuleKey, AdminWritePermissionCode>> = {
  products: 'CATALOG_WRITE',
  categories: 'CATALOG_WRITE',
  brands: 'CATALOG_WRITE',
  sizes: 'CATALOG_WRITE',
  colors: 'CATALOG_WRITE',
  inventory: 'INVENTORY_WRITE',
  inward: 'INVENTORY_WRITE',
  suppliers: 'INVENTORY_WRITE',
  content: 'CONTENT_WRITE',
};

const superadminOnlyModules = new Set<AdminModuleKey>(['staff', 'roles', 'reports']);

export const canAccessAdminModule = (
  moduleKey: AdminModuleKey,
  profile: MeDto | null,
  permissionCodes: readonly string[],
): boolean => {
  if (!profile || !isAdminProfile(profile)) return false;
  if (isSuperAdminProfile(profile)) return true;
  if (moduleKey === 'dashboard') return true;
  if (superadminOnlyModules.has(moduleKey)) return false;

  const requiredPermission = readPermissionByModule[moduleKey];
  return requiredPermission ? permissionCodes.includes(requiredPermission) : false;
};

export const canWriteAdminModule = (
  moduleKey: AdminModuleKey,
  profile: MeDto | null,
  permissionCodes: readonly string[],
): boolean => {
  if (!profile || !isAdminProfile(profile)) return false;
  if (isSuperAdminProfile(profile)) return true;

  const requiredPermission = writePermissionByModule[moduleKey];
  return requiredPermission ? permissionCodes.includes(requiredPermission) : false;
};
