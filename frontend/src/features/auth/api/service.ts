import { AuthService, MeDto } from '../types';
import { mockMe } from '../../../mocks/apiData';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockAuthService: AuthService = {
  async getProfile() {
    return mockMe;
  },
};

const realAuthService: AuthService = {
  async getProfile() {
    const response = await apiClient.get<{ data: MeDto }, { data: MeDto }>('/me');
    return response.data;
  },
};

export const authService = API_MODE === 'mock' ? mockAuthService : realAuthService;
