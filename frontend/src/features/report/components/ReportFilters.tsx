import { useState } from "react";
import type { TrendQuery } from "../types";
import { defaultReportRange } from "../model/reportFilters";

export function ReportFilters({
  query,
  onChange,
}: {
  query: TrendQuery;
  onChange: (value: TrendQuery) => void;
}) {
  const [from, setFrom] = useState(query.from);
  const [to, setTo] = useState(query.to);
  const [error, setError] = useState("");
  return (
    <div className="report-filters">
      <div className="flex flex-wrap gap-2" aria-label="Khoảng thời gian nhanh">
        {[7, 30].map((days) => (
          <button
            key={days}
            type="button"
            className="admin-secondary"
            onClick={() =>
              onChange({
                ...defaultReportRange(days),
                granularity: query.granularity,
              })
            }
          >
            {days} ngày
          </button>
        ))}
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (from > to) {
            setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
            return;
          }
          setError("");
          onChange({ from, to, granularity: query.granularity });
        }}
      >
        <label>
          Từ ngày
          <input
            aria-label="Từ ngày"
            type="date"
            required
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            aria-label="Đến ngày"
            type="date"
            required
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label>
          Chu kỳ
          <select
            aria-label="Chu kỳ"
            value={query.granularity}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "DAY" || value === "WEEK" || value === "MONTH")
                onChange({ ...query, granularity: value });
            }}
          >
            <option value="DAY">Ngày</option>
            <option value="WEEK">Tuần</option>
            <option value="MONTH">Tháng</option>
          </select>
        </label>
        <button type="submit" className="admin-primary">
          Áp dụng khoảng tùy chỉnh
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
