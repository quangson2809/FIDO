import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
import { parseMeResponse } from './runtimeContract';
import type {
  AccountDto,
  AddressDto,
  AddressInput,
  MeDto,
  ProfilePatchInput,
  ProfileService,
} from '../types';

export const profileService: ProfileService = {
  async getMe() {
    const response = await apiClient.get<unknown>('/me');
    return parseMeResponse(response);
  },

  async updateProfile(input: ProfilePatchInput) {
    const response = await apiClient.patch<ApiResponse<AccountDto>>('/me', input);
    return response.data;
  },

  async addAddress(input: AddressInput) {
    const response = await apiClient.post<ApiResponse<AddressDto>>('/me/addresses', input);
    return response.data;
  },

  async updateAddress(addressId: number, input: AddressInput) {
    const response = await apiClient.patch<ApiResponse<AddressDto>>(`/me/addresses/${addressId}`, input);
    return response.data;
  },

  async deleteAddress(addressId: number) {
    await apiClient.delete<void>(`/me/addresses/${addressId}`);
  },
};
