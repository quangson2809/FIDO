export interface ReportOverviewDto {
  from: string;
  to: string;
  completed_sales: number;
  returned_adjustment: number;
  net_sales: number;
  orders_by_status: Record<string, number>;
}
