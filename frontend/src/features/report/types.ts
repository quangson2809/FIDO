import type { OrderStatus } from "../orders/types";

export type ReportGranularity = "DAY" | "WEEK" | "MONTH";
export type ReportTab = "sales" | "orders" | "products";
export interface ReportRange {
  from: string;
  to: string;
}
export interface TrendQuery extends ReportRange {
  granularity: ReportGranularity;
}
export type StatusCounts = Record<OrderStatus, number>;
export interface ReportOverviewDto extends ReportRange {
  completed_sales: number;
  returned_adjustment: number;
  net_sales: number;
  orders_by_status: StatusCounts;
}
export interface SalesPoint {
  period_start: string;
  completed_sales: number;
  returned_adjustment: number;
  net_sales: number;
}
export interface OrdersPoint {
  period_start: string;
  total_orders: number;
  orders_by_status: StatusCounts;
}
export interface SalesTrendDto extends TrendQuery {
  timezone: string;
  points: SalesPoint[];
}
export interface OrdersTrendDto extends TrendQuery {
  timezone: string;
  points: OrdersPoint[];
}
export interface ProductPerformanceItem {
  product_id: number;
  product_name: string;
  thumbnail: string | null;
  completed_units: number;
  returned_units: number;
  net_units: number;
}
export interface ProductPerformanceDto extends ReportRange {
  items: ProductPerformanceItem[];
}
export const reportStatuses: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPING",
  "COMPLETED",
  "DELIVERY_FAILED",
  "CANCELLED",
  "RETURNED",
];
