import { ApiClientError } from "../../../services/http/apiError";
import { reportStatuses } from "../types";
import type {
  ReportOverviewDto,
  ReportGranularity,
  StatusCounts,
  SalesTrendDto,
  OrdersTrendDto,
  ProductPerformanceDto,
} from "../types";

function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiClientError("Dữ liệu báo cáo không hợp lệ.");
  return Reflect.get(value, key);
}
function text(value: unknown): string {
  if (typeof value !== "string")
    throw new ApiClientError("Dữ liệu báo cáo thiếu chuỗi hợp lệ.");
  return value;
}
function numeric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new ApiClientError("Dữ liệu báo cáo thiếu số hợp lệ.");
  return value;
}
function count(value: unknown): number {
  const result = numeric(value);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new ApiClientError("Số lượng báo cáo không hợp lệ.");
  return result;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw new ApiClientError("Danh sách báo cáo không hợp lệ.");
  return value;
}
function statusCounts(value: unknown): StatusCounts {
  return {
    PENDING: count(field(value, "PENDING")),
    CONFIRMED: count(field(value, "CONFIRMED")),
    PREPARING: count(field(value, "PREPARING")),
    SHIPPING: count(field(value, "SHIPPING")),
    COMPLETED: count(field(value, "COMPLETED")),
    DELIVERY_FAILED: count(field(value, "DELIVERY_FAILED")),
    CANCELLED: count(field(value, "CANCELLED")),
    RETURNED: count(field(value, "RETURNED")),
  };
}
function range(value: unknown) {
  return { from: text(field(value, "from")), to: text(field(value, "to")) };
}
function trend(value: unknown) {
  const granularity = field(value, "granularity");
  if (
    granularity !== "DAY" &&
    granularity !== "WEEK" &&
    granularity !== "MONTH"
  )
    throw new ApiClientError("Chu kỳ báo cáo không hợp lệ.");
  const typed: ReportGranularity = granularity;
  const timezone = text(field(value, "timezone"));
  if (timezone !== "Asia/Ho_Chi_Minh")
    throw new ApiClientError("Múi giờ báo cáo không hợp lệ.");
  return { ...range(value), granularity: typed, timezone };
}
export function parseOverview(value: unknown): ReportOverviewDto {
  return {
    ...range(value),
    completed_sales: numeric(field(value, "completed_sales")),
    returned_adjustment: numeric(field(value, "returned_adjustment")),
    net_sales: numeric(field(value, "net_sales")),
    orders_by_status: statusCounts(field(value, "orders_by_status")),
  };
}
export function parseSales(value: unknown): SalesTrendDto {
  return {
    ...trend(value),
    points: list(field(value, "points")).map((point) => ({
      period_start: text(field(point, "period_start")),
      completed_sales: numeric(field(point, "completed_sales")),
      returned_adjustment: numeric(field(point, "returned_adjustment")),
      net_sales: numeric(field(point, "net_sales")),
    })),
  };
}
export function parseOrders(value: unknown): OrdersTrendDto {
  return {
    ...trend(value),
    points: list(field(value, "points")).map((point) => {
      const counts = statusCounts(field(point, "orders_by_status"));
      const total = count(field(point, "total_orders"));
      if (
        reportStatuses.reduce((sum, status) => sum + counts[status], 0) !==
        total
      )
        throw new ApiClientError("Tổng số đơn không khớp dữ liệu trạng thái.");
      return {
        period_start: text(field(point, "period_start")),
        total_orders: total,
        orders_by_status: counts,
      };
    }),
  };
}
export function parseProducts(value: unknown): ProductPerformanceDto {
  return {
    ...range(value),
    items: list(field(value, "items")).map((item) => {
      const thumbnail = field(item, "thumbnail");
      return {
        product_id: count(field(item, "product_id")),
        product_name: text(field(item, "product_name")),
        thumbnail: thumbnail === null ? null : text(thumbnail),
        completed_units: count(field(item, "completed_units")),
        returned_units: count(field(item, "returned_units")),
        net_units: count(field(item, "net_units")),
      };
    }),
  };
}
