import { UserProfileDto, AuthService } from '../types';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockProfile: UserProfileDto = { account_id: 1, email: 'user@fido.com', full_name: 'Nguyen Van A' };

const mockAuthService: AuthService = {
  async getProfile() { return mockProfile; }
};

const realAuthService: AuthService = {
  async getProfile() { return apiClient.get<UserProfileDto, UserProfileDto>('/profile'); }
};

export const authService = API_MODE === 'mock' 
  ? mockAuthService 
  : realAuthService;
