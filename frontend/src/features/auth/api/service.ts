import type { ApiResponse } from '../../../types/api';
import { API_MODE } from '../../../constants/app';
import { apiClient, setApiAccessToken } from '../../../services/http/apiClient';
import type {
  AccountDto,
  AuthService,
  LoginResponseDto,
  MeDto,
} from '../types';

const mockAccount: AccountDto = {
  account_id: 1,
  phone: '0987654321',
  email: 'user@fido.com',
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

const mockAuthService: AuthService = {
  async login() {
    const response: LoginResponseDto = {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 900,
      account: mockAccount,
    };
    setApiAccessToken(response.access_token);
    return response;
  },
  async register(phone, email) {
    return { ...mockAccount, phone, email };
  },
  async getMe() {
    return {
      account: mockAccount,
      addresses: [],
      roles: [],
      permissions: [],
    };
  },
  logout() {
    setApiAccessToken(null);
  },
};

const realAuthService: AuthService = {
  async login(identifier, password) {
    const response = await apiClient.post<
      ApiResponse<LoginResponseDto>,
      ApiResponse<LoginResponseDto>
    >('/auth/login', { identifier, password });
    setApiAccessToken(response.data.access_token);
    return response.data;
  },
  async register(phone, email, password) {
    const response = await apiClient.post<
      ApiResponse<AccountDto>,
      ApiResponse<AccountDto>
    >('/auth/register', { phone, email, password });
    return response.data;
  },
  async getMe() {
    const response = await apiClient.get<ApiResponse<MeDto>, ApiResponse<MeDto>>('/me');
    return response.data;
  },
  logout() {
    setApiAccessToken(null);
  },
};

export const authService = API_MODE === 'mock'
  ? mockAuthService
  : realAuthService;
