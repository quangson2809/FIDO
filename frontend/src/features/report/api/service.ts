import { apiClient } from '../../../services/http/apiClient';
import type { ApiResponse } from '../../../types/api';
import type { ReportOverviewDto } from '../types';

export const reportService = {
  async getOverview(from: string, to: string): Promise<ReportOverviewDto> {
    const response = await apiClient.get<ApiResponse<ReportOverviewDto>, ApiResponse<ReportOverviewDto>>(
      '/admin/reports/overview',
      { params: { from, to } },
    );
    return response.data;
  },
};
