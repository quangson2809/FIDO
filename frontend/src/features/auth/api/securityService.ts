import { apiClient } from '../../../services/http/apiClient';
export const securityService = {
  changePassword: (current_password: string, new_password: string) => apiClient.post<void>('/me/password', { current_password, new_password }),
  requestVerification: () => apiClient.post<void>('/me/email/verification'),
  verifyEmail: (token: string) => apiClient.post<void>('/auth/email/verify', { token }),
  requestReset: (email: string) => apiClient.post<void>('/auth/password-reset/request', { email }),
  reset: (token: string, new_password: string) => apiClient.post<void>('/auth/password-reset/confirm', { token, new_password }),
};
