import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../api/service';
import { profileService } from '../api/profileService';
import type { MeDto } from '../types';
import { isAdminProfile } from './sessionAccess';
import { AuthSessionContext, type AuthSessionStatus } from './sessionContext';
import {
  hasApiAccessToken,
  subscribeToApiAccessToken,
} from '../../../services/http/apiClient';

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthSessionStatus>(
    hasApiAccessToken() ? 'checking' : 'unauthenticated',
  );
  const [profile, setProfile] = useState<MeDto | null>(null);

  const clearSessionState = useCallback(() => {
    setProfile(null);
    setStatus('unauthenticated');
  }, []);

  const refreshProfile = useCallback(async (): Promise<MeDto | null> => {
    if (!hasApiAccessToken()) {
      clearSessionState();
      return null;
    }

    setStatus('checking');
    try {
      const me = await profileService.getMe();
      setProfile(me);
      setStatus('authenticated');
      return me;
    } catch (error) {
      authService.logout();
      clearSessionState();
      throw error;
    }
  }, [clearSessionState]);

  useEffect(() => {
    let active = true;

    if (hasApiAccessToken()) {
      void profileService.getMe()
        .then((me) => {
          if (!active) return;
          setProfile(me);
          setStatus('authenticated');
        })
        .catch(() => {
          if (!active) return;
          authService.logout();
          clearSessionState();
        });
    }

    const unsubscribe = subscribeToApiAccessToken((token) => {
      if (!token && active) clearSessionState();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [clearSessionState]);

  const login = useCallback(async (identifier: string, password: string): Promise<MeDto> => {
    setStatus('checking');
    try {
      await authService.login(identifier, password);
      const me = await profileService.getMe();
      setProfile(me);
      setStatus('authenticated');
      return me;
    } catch (error) {
      authService.logout();
      clearSessionState();
      throw error;
    }
  }, [clearSessionState]);

  const logout = useCallback(() => {
    authService.logout();
    clearSessionState();
  }, [clearSessionState]);

  const permissionCodes = useMemo(
    () => profile?.permissions.map((permission) => permission.code) ?? [],
    [profile],
  );

  const value = useMemo<AuthSessionContextValue>(() => ({
    status,
    profile,
    isAuthenticated: status === 'authenticated',
    isAdmin: isAdminProfile(profile),
    permissionCodes,
    login,
    logout,
    refreshProfile,
  }), [login, logout, permissionCodes, profile, refreshProfile, status]);

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};

