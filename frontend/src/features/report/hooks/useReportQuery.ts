import { useCallback } from 'react';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { reportService } from '../api/service';
import type { TrendQuery } from '../types';
import { precedingReportRange } from '../model/reportFilters';

export function useSalesReport({ from, to, granularity }: TrendQuery) {
  return useRemoteQuery(
    useCallback(async () => {
      const query = { from, to, granularity };
      const [overview, trend, previousTrend] = await Promise.all([
        reportService.getOverview(from, to),
        reportService.getSalesTrend(query),
        // Comparison is supplementary: a transient failure must not hide valid primary metrics.
        reportService.getSalesTrend(precedingReportRange(query)).catch(() => null),
      ]);
      return { overview, trend, previousTrend };
    }, [from, to, granularity]),
  );
}
export function useOrdersReport({ from, to, granularity }: TrendQuery) {
  return useRemoteQuery(
    useCallback(async () => {
      const [overview, trend] = await Promise.all([
        reportService.getOverview(from, to),
        reportService.getOrdersTrend({ from, to, granularity }),
      ]);
      return { overview, trend };
    }, [from, to, granularity]),
  );
}
export function useProductsReport({ from, to }: TrendQuery, limit = 10) {
  return useRemoteQuery(
    useCallback(() => reportService.getProductPerformance({ from, to }, limit), [from, to, limit]),
  );
}
export function useDashboardReport({ from, to, granularity }: TrendQuery) {
  return useRemoteQuery(
    useCallback(async () => {
      const query = { from, to, granularity };
      const [overview, trend, previousTrend, products] = await Promise.all([
        reportService.getOverview(from, to),
        reportService.getSalesTrend(query),
        // Comparison is supplementary: a transient failure must not hide valid primary metrics.
        reportService.getSalesTrend(precedingReportRange(query)).catch(() => null),
        reportService.getProductPerformance({ from, to }, 5),
      ]);
      return { overview, trend, previousTrend, products };
    }, [from, to, granularity]),
  );
}
