import { apiClient } from '../../../services/http/apiClient';
import type { ApiResponse } from '../../../types/api';
import type {
  ContentPageCreateInput,
  ContentPageDto,
  ContentPagePatchInput,
  PublicContentPageDto,
} from '../types';

export const contentService = {
  async getPublicPage(pageCode: string): Promise<PublicContentPageDto> {
    const response = await apiClient.get<ApiResponse<PublicContentPageDto>>(
      `/content-pages/${encodeURIComponent(pageCode)}`,
    );
    return response.data;
  },

  async getAdminPages(): Promise<ContentPageDto[]> {
    const response = await apiClient.get<ApiResponse<ContentPageDto[]>>(
      '/admin/content-pages',
    );
    return response.data;
  },

  async createPage(input: ContentPageCreateInput): Promise<ContentPageDto> {
    const response = await apiClient.post<ApiResponse<ContentPageDto>>(
      '/admin/content-pages',
      input,
    );
    return response.data;
  },

  async updatePage(pageId: number, input: ContentPagePatchInput): Promise<ContentPageDto> {
    const response = await apiClient.patch<ApiResponse<ContentPageDto>>(
      `/admin/content-pages/${pageId}`,
      input,
    );
    return response.data;
  },
};
