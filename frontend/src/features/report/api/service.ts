import { apiClient } from "../../../services/http/apiClient";
import type { ApiResponse } from "../../../types/api";
import type { TrendQuery, ReportRange } from "../types";
import {
  parseOverview,
  parseSales,
  parseOrders,
  parseProducts,
} from "./parseReport";

export const reportService = {
  async getOverview(from: string, to: string) {
    const response = await apiClient.get<ApiResponse<unknown>>(
      "/admin/reports/overview",
      { params: { from, to } },
    );
    return parseOverview(response.data);
  },
  async getSalesTrend(query: TrendQuery) {
    const response = await apiClient.get<ApiResponse<unknown>>(
      "/admin/reports/sales-trend",
      { params: query },
    );
    return parseSales(response.data);
  },
  async getOrdersTrend(query: TrendQuery) {
    const response = await apiClient.get<ApiResponse<unknown>>(
      "/admin/reports/orders-trend",
      { params: query },
    );
    return parseOrders(response.data);
  },
  async getProductPerformance(query: ReportRange, limit = 10) {
    const response = await apiClient.get<ApiResponse<unknown>>(
      "/admin/reports/product-performance",
      { params: { ...query, limit } },
    );
    return parseProducts(response.data);
  },
};
