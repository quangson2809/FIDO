import { getVietnamToday } from "../../../shared/time/vietnamCalendar";
import type { ReportGranularity, ReportTab, TrendQuery } from "../types";

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function isCalendarDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function defaultReportRange(days = 30): TrendQuery {
  const to = getVietnamToday();
  return { from: shiftDate(to, 1 - days), to, granularity: "DAY" };
}
export function readReportFilters(
  params: URLSearchParams,
): TrendQuery & { tab: ReportTab; valid: boolean } {
  const defaults = defaultReportRange();
  const from = params.get("from") ?? defaults.from;
  const to = params.get("to") ?? defaults.to;
  const raw = params.get("granularity") ?? "DAY";
  const granularity: ReportGranularity =
    raw === "WEEK" || raw === "MONTH" ? raw : "DAY";
  const rawTab = params.get("tab");
  const tab: ReportTab =
    rawTab === "orders" || rawTab === "products" ? rawTab : "sales";
  return {
    from,
    to,
    granularity,
    tab,
    valid:
      isCalendarDate(from) &&
      isCalendarDate(to) &&
      from <= to &&
      ["DAY", "WEEK", "MONTH"].includes(raw),
  };
}
export function reportSearch(query: TrendQuery, tab: ReportTab): string {
  return new URLSearchParams({
    tab,
    from: query.from,
    to: query.to,
    granularity: query.granularity,
  }).toString();
}
export function orderDrilldown(
  query: TrendQuery,
  status?: string,
  periodStart?: string,
): string {
  let from = query.from;
  let to = query.to;
  if (periodStart) {
    from = periodStart > from ? periodStart : from;
    let end = periodStart;
    if (query.granularity === "WEEK") end = shiftDate(periodStart, 6);
    if (query.granularity === "MONTH") {
      const next = new Date(`${periodStart}T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      end = shiftDate(next.toISOString().slice(0, 10), -1);
    }
    to = end < to ? end : to;
  }
  // API upper bound is inclusive; retain microsecond precision (not JS millisecond endOfDay).
  const midnight = new Date(`${from}T00:00:00+07:00`)
    .toISOString()
    .replace(".000Z", "Z");
  const endSecond = new Date(
    new Date(`${shiftDate(to, 1)}T00:00:00+07:00`).getTime() - 1000,
  )
    .toISOString()
    .replace(".000Z", ".999999Z");
  const params = new URLSearchParams({
    created_from: midnight,
    created_to: endSecond,
  });
  if (status) params.set("status", status);
  return `/admin/orders?${params}`;
}
