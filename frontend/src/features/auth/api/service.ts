import type { ApiResponse } from '../../../types/api';
import { apiClient, setApiAccessToken } from '../../../services/http/apiClient';
import { parseLoginResponse } from './runtimeContract';
import type {
  AccountDto,
  AuthService,
  LoginResponseDto,
} from '../types';

export const authService: AuthService = {
  async login(identifier, password) {
    const response = await apiClient.post<unknown>('/auth/login', { identifier, password });
    const login = parseLoginResponse(response);
    setApiAccessToken(login.access_token);
    return login;
  },
  async register(phone, email, password) {
    const response = await apiClient.post<ApiResponse<AccountDto>>('/auth/register', { phone, email, password });
    return response.data;
  },
  logout() {
    setApiAccessToken(null);
  },
};
