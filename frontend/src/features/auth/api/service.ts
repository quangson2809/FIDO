import type { ApiResponse } from '../../../types/api';
import { apiClient, setApiAccessToken } from '../../../services/http/apiClient';
import type {
  AccountDto,
  AuthService,
  LoginResponseDto,
} from '../types';

export const authService: AuthService = {
  async login(identifier, password) {
    const response = await apiClient.post<ApiResponse<LoginResponseDto>>('/auth/login', { identifier, password });
    setApiAccessToken(response.data.access_token);
    return response.data;
  },
  async register(phone, email, password) {
    const response = await apiClient.post<ApiResponse<AccountDto>>('/auth/register', { phone, email, password });
    return response.data;
  },
  logout() {
    setApiAccessToken(null);
  },
};
