import { apiClient, setApiAccessToken } from '../../../services/http/apiClient';
import { parseLoginResponse } from './runtimeContract';
import type { AuthService } from '../types';

export const authService: AuthService = {
  async login(identifier, password) {
    const response = await apiClient.post<unknown>('/auth/login', { phone: identifier, password });
    const login = parseLoginResponse(response);
    setApiAccessToken(login.access_token);
    return login;
  },
  async register(phone, fullName, email, password) {
    const response = await apiClient.post<unknown>('/auth/register', {
      phone,
      full_name: fullName,
      email,
      password,
    });
    const registration = parseLoginResponse(response, 'POST /auth/register');
    setApiAccessToken(registration.access_token);
    return registration;
  },
  logout() {
    setApiAccessToken(null);
  },
};
