import { useId, useState } from "react";
import type { SalesPoint } from "../types";
import { formatReportMoney } from "../model/formatReportMoney";

type RevenueMetric = "net_sales" | "completed_sales";
interface RevenueAreaChartProps {
  points: SalesPoint[];
  previousPoints?: SalesPoint[];
}

const WIDTH = 760;
const TOP = 24;
const BOTTOM = 230;
const LEFT = 84;
const RIGHT = 740;
const PERIOD_TICKS = 5;

interface Coordinate {
  x: number;
  y: number;
}

// Monotone cubic interpolation: each source point remains exact and the curve
// cannot invent a higher peak or lower trough between adjacent observations.
function smoothLine(points: Coordinate[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const slopes = points.slice(1).map((point, index) =>
    (point.y - points[index].y) / (point.x - points[index].x),
  );
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before * after <= 0) return 0;
    return Math.sign(before) * Math.min(Math.abs(before), Math.abs(after)) * 2;
  });
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    return `${path} C ${(previous.x + width / 3).toFixed(2)} ${(previous.y + tangents[index] * width / 3).toFixed(2)} ${(point.x - width / 3).toFixed(2)} ${(point.y - tangents[index + 1] * width / 3).toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

const formatAxis = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(amount);

export function RevenueAreaChart({ points, previousPoints }: RevenueAreaChartProps) {
  const [metric, setMetric] = useState<RevenueMetric>("net_sales");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const current = points.map((point) => point[metric]);
  // A preceding interval is only drawn when every bucket has a counterpart.
  // In particular, partial WEEK/MONTH ranges can have different bucket counts.
  const comparable = Boolean(previousPoints && previousPoints.length === points.length && points.length > 0);
  const previous = comparable && previousPoints ? previousPoints.map((point) => point[metric]) : [];
  const all = [...current, ...previous, 0];
  const min = Math.min(...all);
  const max = Math.max(1, ...all);
  const span = max - min || 1;
  const valueY = (value: number) => BOTTOM - ((value - min) / span) * (BOTTOM - TOP);
  const pointX = (index: number) =>
    points.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + index * (RIGHT - LEFT) / Math.max(1, points.length - 1);
  const coords = current.map((value, index) => ({ x: pointX(index), y: valueY(value) }));
  const priorCoords = previous.map((value, index) => ({ x: pointX(index), y: valueY(value) }));
  const baseline = valueY(0);
  const area = coords.length
    ? `${smoothLine(coords)} L ${coords[coords.length - 1].x} ${baseline} L ${coords[0].x} ${baseline} Z`
    : "";
  const peakIndex = current.reduce(
    (best, value, index) => value > (current[best] ?? -Infinity) ? index : best,
    0,
  );
  const highlighted = activeIndex ?? (current[peakIndex] > 0 ? peakIndex : null);
  const selected = highlighted === null ? null : points[highlighted];
  const label = metric === "net_sales" ? "Doanh số thuần" : "Doanh số hoàn tất";

  return (
    <div className="revenue-area" data-chart="revenue-area">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#606863]">Doanh số theo ngày hoàn tất · Asia/Ho_Chi_Minh</p>
        <div role="group" aria-label="Chỉ số doanh thu" className="flex flex-wrap gap-1 rounded-lg bg-[#F3F4EF] p-1">
          {([
            ["net_sales", "Doanh số thuần"],
            ["completed_sales", "Doanh số hoàn tất"],
          ] as const).map(([key, text]) => (
            <button key={key} type="button" aria-pressed={metric === key}
              onClick={() => { setMetric(key); setActiveIndex(null); }}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${metric === key ? "bg-white text-[#0B2419] shadow-sm" : "text-[#59665E] hover:bg-white/70"}`}>
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#606863]" aria-label="Chú giải doanh thu">
        <span><span aria-hidden="true" className="font-bold text-[#0B2419]">━</span> {label} trong kỳ</span>
        {comparable ? <span><span aria-hidden="true" className="font-bold text-[#A3A9A1]">┄</span> Khoảng liền trước</span> : null}
      </div>
      <svg viewBox={`0 0 ${WIDTH} 276`} role="group" aria-label={`Biểu đồ vùng ${label} theo thời gian`}
        className="mt-3 h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1B5038" stopOpacity=".26" />
            <stop offset="100%" stopColor="#1B5038" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: PERIOD_TICKS }, (_, tick) => {
          const value = min + (span * tick) / (PERIOD_TICKS - 1);
          const y = valueY(value);
          return <g key={tick}>
            <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="#E2E5DE" strokeDasharray="4 4" />
            <text x={LEFT - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#606863">{formatAxis(value)}</text>
          </g>;
        })}
        {area ? <path data-series="area" d={area} fill={`url(#${gradientId})`} /> : null}
        {priorCoords.length ? <path data-series="previous" d={smoothLine(priorCoords)} fill="none" stroke="#A3A9A1"
          strokeWidth="2.5" strokeDasharray="6 5" /> : null}
        {coords.length ? <path data-series="current" d={smoothLine(coords)} fill="none" stroke="#0B2419"
          strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {highlighted !== null && coords[highlighted] ? <>
          <circle cx={coords[highlighted].x} cy={coords[highlighted].y} r="8" fill="#E8C75B" stroke="#0B2419" strokeWidth="2" />
        </> : null}
        {points.map((point, index) => (
          <g key={point.period_start}>
            <rect tabIndex={0} role="img"
              x={pointX(index) - Math.min(11, (RIGHT - LEFT) / Math.max(2, points.length) / 2)}
              y={TOP} width={Math.min(22, (RIGHT - LEFT) / Math.max(1, points.length))}
              height={BOTTOM - TOP} fill="transparent"
              aria-label={`${point.period_start}: ${label} ${formatReportMoney(current[index])}${comparable ? `, kỳ trước ${formatReportMoney(previous[index])}` : ""}`}
              onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
              <title>{`${point.period_start}: ${formatReportMoney(current[index])}`}</title>
            </rect>
            {(index === 0 || index === points.length - 1 ||
              (points.length <= 10 || index % Math.max(1, Math.ceil(points.length / 6)) === 0)) ?
              <text x={pointX(index)} y="257" fontSize="12" fill="#606863" textAnchor="middle">{point.period_start.slice(5)}</text> : null}
          </g>
        ))}
      </svg>
      <div className="report-tooltip" aria-live="polite">
        {selected && highlighted !== null ? <>
          <strong>{selected.period_start}</strong>
          <span>{label}: {formatReportMoney(current[highlighted])}</span>
          {comparable ? <span>Kỳ trước ({previousPoints?.[highlighted]?.period_start}): {formatReportMoney(previous[highlighted])}</span> : null}
        </> : <span>{points.length ? "Di chuyển chuột hoặc Tab qua từng kỳ để xem số liệu." : "Chưa có dữ liệu trong khoảng ngày đã chọn."}</span>}
      </div>
      {previousPoints && !comparable && points.length > 0 ?
        <p className="mt-2 text-xs text-[#687069]">Hai khoảng có số kỳ {points.length} và {previousPoints.length} khác nhau; không vẽ đường so sánh để tránh sai lệch.</p> : null}
    </div>
  );
}
