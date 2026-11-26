import { apiClient } from '../../../services/http/apiClient';

export const securityService = {
  sendOtp: (email: string) => apiClient.post<void>('/email/send-otp', { email }),
  verifyOtp: (email: string, otp: string) =>
    apiClient.post<void>('/auth/email/verify-otp', { email, otp }),
  changePassword: (otp: string, password: string, confirm_password: string) =>
    apiClient.post<void>('/me/password', { otp, password, confirm_password }),
  reset: (email: string, otp: string, password: string, confirm_password: string) =>
    apiClient.post<void>('/auth/password-reset/confirm', { email, otp, password, confirm_password }),
};
