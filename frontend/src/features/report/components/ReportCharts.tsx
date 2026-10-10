import { useState } from 'react';
import type { SalesPoint, OrdersPoint } from '../types';
import { reportStatuses } from '../types';
import { statusLabel } from '../../../shared/admin/statusLabels';

import { formatReportMoney } from '../model/formatReportMoney';
const colors = ['#1B5038', '#9C6519', '#276C9C', '#735493', '#A53B48', '#287B78', '#666258', '#50668C'];
interface Series { label: string; values: number[]; color: string; }

// Coordinates and tooltip state only; metrics are supplied by the backend.
function TrendPlot({ dates, series, unit, onPeriod }: {
  dates: string[]; series: Series[]; unit: 'VND' | 'đơn'; onPeriod?: (date: string) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const values = series.flatMap((item) => item.values);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const x = (index: number) => 75 + index * 650 / Math.max(1, dates.length - 1);
  const y = (value: number) => 240 - (value - min) * 200 / (max - min);
  const format = (value: number) => unit === 'VND' ? formatReportMoney(value) : `${value} đơn`;
  return <div className="report-plot">
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Chú giải">{series.map((item, index) => <span key={item.label}><span aria-hidden="true" style={{ color: item.color }}>● {index + 1}. </span>{item.label}</span>)}</div>
    <p className="mt-3 text-xs text-[#606863]">Đơn vị: {unit} · Di chuyển bằng Tab để đọc từng kỳ.</p>
    <svg viewBox="0 0 800 300" role="img" aria-label={`Biểu đồ theo thời gian, đơn vị ${unit}`} className="w-full min-w-0">
      {[0, 1, 2, 3, 4].map((tick) => {
        const value = min + (max - min) * tick / 4;
        return <g key={tick}><line x1="75" x2="725" y1={y(value)} y2={y(value)} stroke="#D9DDD6" /><text x="68" y={y(value) + 4} textAnchor="end" fontSize="10" fill="#606863">{new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</text></g>;
      })}
      {series.map((item, index) => <polyline key={item.label} fill="none" stroke={item.color} strokeWidth="2.5" strokeDasharray={index === 0 ? undefined : `${5 + index * 2} 3`} points={item.values.map((value, i) => `${x(i)},${y(value)}`).join(' ')} />)}
      {dates.map((date, index) => <g key={date}>
        {series.map((item) => <circle key={item.label} cx={x(index)} cy={y(item.values[index] ?? 0)} r={dates.length === 1 ? 4 : 2} fill={item.color} />)}
        <rect x={x(index) - 7} y="30" width="14" height="220" fill="transparent" tabIndex={0}
          role={onPeriod ? 'button' : 'img'} aria-label={`${date}: ${series.map((item) => `${item.label} ${format(item.values[index] ?? 0)}`).join(', ')}${onPeriod ? '. Mở danh sách đơn.' : ''}`}
          onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)}
          onClick={() => onPeriod?.(date)} onKeyDown={(event) => { if (onPeriod && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onPeriod(date); } }}>
          <title>{date}: {series.map((item) => `${item.label} ${format(item.values[index] ?? 0)}`).join(', ')}</title>
        </rect>
        {(index === 0 || index === dates.length - 1 || (dates.length < 12 && index % 2 === 0)) && <text x={x(index)} y="270" textAnchor="middle" fontSize="11" fill="#606863">{date.slice(5)}</text>}
      </g>)}
      <text x="400" y="295" textAnchor="middle" fontSize="11" fill="#606863">Ngày bắt đầu kỳ · Asia/Ho_Chi_Minh</text>
    </svg>
    <div className="report-tooltip" aria-live="polite">{active !== null && dates[active] ? <><strong>{dates[active]}</strong>{series.map((item) => <span key={item.label}>{item.label}: {format(item.values[active] ?? 0)}</span>)}</> : <span>Đưa con trỏ hoặc focus vào kỳ để xem số liệu.</span>}</div>
  </div>;
}
export function SalesChart({ points }: { points: SalesPoint[] }) {
  return <TrendPlot dates={points.map((point) => point.period_start)} unit="VND" series={[
    { label: 'Doanh số hoàn tất', color: colors[0], values: points.map((point) => point.completed_sales) },
    { label: 'Điều chỉnh trả hàng', color: colors[1], values: points.map((point) => point.returned_adjustment) },
    { label: 'Doanh số thuần', color: colors[2], values: points.map((point) => point.net_sales) },
  ]} />;
}
export function OrdersChart({ points, onPeriod }: { points: OrdersPoint[]; onPeriod?: (period: string) => void }) {
  return <TrendPlot dates={points.map((point) => point.period_start)} unit="đơn" onPeriod={onPeriod} series={reportStatuses.map((status, index) => ({
    label: statusLabel(status), color: colors[index] ?? '#071A12', values: points.map((point) => point.orders_by_status[status]),
  }))} />;
}
