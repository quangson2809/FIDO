import type { MeDto } from '../types';

export const isAdminProfile = (profile: MeDto | null): boolean =>
  profile?.roles.some((role) => role.code === 'ADMIN' || role.code === 'SUPERADMIN') ?? false;
