import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '../api/service';
import { profileService } from '../api/profileService';
import type { MeDto } from '../types';
import { isAdminProfile } from './sessionAccess';
import { normalizeApiError } from '../../../services/http/apiError';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
import { AuthSessionContext, type AuthSessionContextValue, type AuthSessionStatus } from './sessionContext';
import {
  hasApiAccessToken,
  subscribeToApiAccessToken,
} from '../../../services/http/apiClient';

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthSessionStatus>(
    hasApiAccessToken() ? 'checking' : 'unauthenticated',
  );
  const [profile, setProfile] = useState<MeDto | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionVersion = useRef(0);

  const clearSessionState = useCallback(() => {
    setProfile(null);
    setSessionError(null);
    setStatus('unauthenticated');
  }, []);

  const handleProfileFailure = useCallback((error: unknown) => {
    const { status: responseStatus } = normalizeApiError(error);
    if (responseStatus === 401 || responseStatus === 403) {
      authService.logout();
      clearSessionState();
      return;
    }
    // A temporary read failure does not invalidate credentials. Keep protected routes closed until retry verifies /me.
    setSessionError(getStorefrontErrorMessage(error, 'Chưa thể kiểm tra tài khoản. Vui lòng thử lại khi có kết nối.'));
    setStatus('checking');
  }, [clearSessionState]);

  const refreshProfile = useCallback(async (): Promise<MeDto | null> => {
    if (!hasApiAccessToken()) {
      clearSessionState();
      return null;
    }

    setStatus('checking');
    setSessionError(null);
    const version = sessionVersion.current;
    try {
      const me = await profileService.getMe();
      if (version !== sessionVersion.current || !hasApiAccessToken()) return null;
      setProfile(me);
      setSessionError(null);
      setStatus('authenticated');
      return me;
    } catch (error) {
      if (version === sessionVersion.current) handleProfileFailure(error);
      throw error;
    }
  }, [clearSessionState, handleProfileFailure]);

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;

    if (hasApiAccessToken()) {
      void profileService.getMe()
        .then((me) => {
          if (!active || version !== sessionVersion.current || !hasApiAccessToken()) return;
          setProfile(me);
          setSessionError(null);
          setStatus('authenticated');
        })
        .catch((error: unknown) => {
          if (!active || version !== sessionVersion.current) return;
          handleProfileFailure(error);
        });
    }

    const unsubscribe = subscribeToApiAccessToken((token) => {
      sessionVersion.current += 1;
      if (!token && active) clearSessionState();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [clearSessionState, handleProfileFailure]);

  const login = useCallback(async (identifier: string, password: string): Promise<MeDto> => {
    setStatus('checking');
    setSessionError(null);
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
    sessionError,
    profile,
    isAuthenticated: status === 'authenticated',
    isAdmin: isAdminProfile(profile),
    permissionCodes,
    login,
    logout,
    refreshProfile,
  }), [login, logout, permissionCodes, profile, refreshProfile, sessionError, status]);

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};

