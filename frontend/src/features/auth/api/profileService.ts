import { apiClient } from '../../../services/http/apiClient';
import { parseAccountResponse, parseAddressResponse, parseMeResponse } from './runtimeContract';
import type { AddressInput, ProfilePatchInput, ProfileService } from '../types';

export const profileService: ProfileService = {
  async getMe() {
    const response = await apiClient.get<unknown>('/me');
    return parseMeResponse(response);
  },

  async updateProfile(input: ProfilePatchInput) {
    const response = await apiClient.patch<unknown>('/me', input);
    return parseAccountResponse(response, 'PATCH /me');
  },

  async addAddress(input: AddressInput) {
    const response = await apiClient.post<unknown>('/me/addresses', input);
    return parseAddressResponse(response, 'POST /me/addresses');
  },

  async updateAddress(addressId: number, input: AddressInput) {
    const endpoint = `PATCH /me/addresses/${addressId}`;
    const response = await apiClient.patch<unknown>(`/me/addresses/${addressId}`, input);
    return parseAddressResponse(response, endpoint);
  },

  async deleteAddress(addressId: number) {
    await apiClient.delete<void>(`/me/addresses/${addressId}`);
  },
};
