import { useCallback } from "react";
import { useRemoteQuery } from "../../../shared/hooks/useRemoteQuery";
import { reportService } from "../api/service";
import type { TrendQuery } from "../types";

export function useSalesReport({ from, to, granularity }: TrendQuery) {
  return useRemoteQuery(
    useCallback(async () => {
      const [overview, trend] = await Promise.all([
        reportService.getOverview(from, to),
        reportService.getSalesTrend({ from, to, granularity }),
      ]);
      return { overview, trend };
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
    useCallback(
      () => reportService.getProductPerformance({ from, to }, limit),
      [from, to, limit],
    ),
  );
}
export function useDashboardReport({ from, to, granularity }: TrendQuery) {
  return useRemoteQuery(
    useCallback(async () => {
      const [overview, trend, products] = await Promise.all([
        reportService.getOverview(from, to),
        reportService.getSalesTrend({ from, to, granularity }),
        reportService.getProductPerformance({ from, to }, 5),
      ]);
      return { overview, trend, products };
    }, [from, to, granularity]),
  );
}
