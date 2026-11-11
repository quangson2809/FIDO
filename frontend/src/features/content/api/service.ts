import { apiClient } from '../../../services/http/apiClient';
import type { ApiResponse } from '../../../types/api';
import type {
  ContentPageCreateInput,
  ContentPageDto,
  ContentPageSummaryDto,
  ContentPagePatchInput,
  PublicContentPageDto,
} from '../types';

type WireSummary = Omit<ContentPageSummaryDto, 'page_id' | 'page_code'> & { id: number; slug: string };
type WirePage = WireSummary & { content: string; updated_by_account_id: number };
const summary = (page: WireSummary): ContentPageSummaryDto => ({
  page_id: page.id, page_code: page.slug, title: page.title, status: page.status, updated_at: page.updated_at,
});
const detail = (page: WirePage): ContentPageDto => ({
  ...summary(page), content: page.content, updated_by_account_id: page.updated_by_account_id,
});

export const contentService = {
  async getPublicPage(pageCode: string): Promise<PublicContentPageDto> {
    const response = await apiClient.get<ApiResponse<Omit<PublicContentPageDto, 'page_code'> & { slug: string }>>(
      `/content-pages/${encodeURIComponent(pageCode)}`,
    );
    return { ...response.data, page_code: response.data.slug };
  },

  async getAdminPages(): Promise<ContentPageSummaryDto[]> {
    const response = await apiClient.get<ApiResponse<WireSummary[]>>('/admin/content-pages');
    return response.data.map(summary);
  },

  async getAdminPage(id: number): Promise<ContentPageDto> {
    const response = await apiClient.get<ApiResponse<WirePage>>(`/admin/content-pages/${id}`);
    return detail(response.data);
  },

  async createPage(input: ContentPageCreateInput): Promise<ContentPageDto> {
    const response = await apiClient.post<ApiResponse<WirePage>>(
      '/admin/content-pages',
      { slug: input.page_code, title: input.title, content: input.content },
    );
    return detail(response.data);
  },

  async updatePage(pageId: number, input: ContentPagePatchInput): Promise<ContentPageDto> {
    const response = await apiClient.patch<ApiResponse<WirePage>>(
      `/admin/content-pages/${pageId}`,
      input,
    );
    return detail(response.data);
  },
};
