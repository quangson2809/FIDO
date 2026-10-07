import { createContext } from 'react';
import type { MeDto } from '../types';

export type AuthSessionStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthSessionContextValue {
  status: AuthSessionStatus;
  profile: MeDto | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissionCodes: readonly string[];
  login: (identifier: string, password: string) => Promise<MeDto>;
  logout: () => void;
  refreshProfile: () => Promise<MeDto | null>;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);
