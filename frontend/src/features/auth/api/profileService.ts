import type { ApiResponse } from '../../../types/api';
import { apiClient } from '../../../services/http/apiClient';
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
    const response = await apiClient.get<ApiResponse<MeDto>, ApiResponse<MeDto>>('/me');
    return response.data;
  },

  async updateProfile(input: ProfilePatchInput) {
    const response = await apiClient.patch<
      ApiResponse<AccountDto>,
      ApiResponse<AccountDto>
    >('/me', input);
    return response.data;
  },

  async addAddress(input: AddressInput) {
    const response = await apiClient.post<
      ApiResponse<AddressDto>,
      ApiResponse<AddressDto>
    >('/me/addresses', input);
    return response.data;
  },

  async updateAddress(addressId: number, input: AddressInput) {
    const response = await apiClient.patch<
      ApiResponse<AddressDto>,
      ApiResponse<AddressDto>
    >(`/me/addresses/${addressId}`, input);
    return response.data;
  },

  async deleteAddress(addressId: number) {
    await apiClient.delete<void, void>(`/me/addresses/${addressId}`);
  },
};
