import { useState } from "react";
import type { OrderStatus } from "../../orders/types";
import type { StatusCounts } from "../types";
import { reportStatuses } from "../types";
import { statusLabel } from "../../../shared/admin/statusLabels";

interface OrderStatusDonutProps {
  counts: StatusCounts;
  onSelectStatus?: (status: OrderStatus) => void;
}

const palette: Record<OrderStatus, string> = {
  PENDING: "#B98914",
  CONFIRMED: "#BE8B40",
  PREPARING: "#E4B24B",
  SHIPPING: "#2867A0",
  COMPLETED: "#1B5038",
  DELIVERY_FAILED: "#7C5A97",
  CANCELLED: "#C54E4A",
  RETURNED: "#8051A5",
};

const RADIUS = 61;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function percentage(count: number, total: number): string {
  return total === 0 ? "0%" : `${(count / total * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

export function OrderStatusDonut({ counts, onSelectStatus }: OrderStatusDonutProps) {
  const [focused, setFocused] = useState<OrderStatus | null>(null);
  const total = reportStatuses.reduce((sum, status) => sum + counts[status], 0);
  let consumed = 0;
  const segments = reportStatuses.map((status) => {
    const count = counts[status];
    const length = total ? (count / total) * CIRCUMFERENCE : 0;
    const offset = consumed;
    consumed += length;
    return { status, count, length, offset };
  });
  const selected = focused ?? "COMPLETED";
  const selectedCount = counts[selected];

  return (
    <article className="report-card h-full" data-chart="order-status-donut">
      <h2>Phân bố trạng thái hiện tại</h2>
      <p className="report-description">Trạng thái hiện tại của các đơn được tạo trong kỳ · {total.toLocaleString("vi-VN")} đơn</p>
      <div className="relative mx-auto my-5 aspect-square w-48 max-w-full">
        <svg viewBox="0 0 180 180" className="h-full w-full" role="group"
          aria-label={`Biểu đồ donut phân bố ${total} đơn theo tám trạng thái`}>
          <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#EDF0E9" strokeWidth="22" />
          {segments.filter((segment) => segment.count > 0).map(({ status, count, length, offset }) => (
            <circle key={status} data-status={status} cx="90" cy="90" r={RADIUS}
              transform="rotate(-90 90 90)" fill="none"
              stroke={palette[status]} strokeWidth={focused === status ? 27 : 22}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset} className={onSelectStatus ? "cursor-pointer" : ""}
              tabIndex={onSelectStatus ? 0 : undefined}
              role={onSelectStatus ? "button" : "img"}
              aria-label={`${statusLabel(status)}: ${count} đơn, ${percentage(count, total)}`}
              onMouseEnter={() => setFocused(status)} onMouseLeave={() => setFocused(null)}
              onFocus={() => setFocused(status)} onBlur={() => setFocused(null)}
              onClick={() => onSelectStatus?.(status)}
              onKeyDown={(event) => {
                if (onSelectStatus && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelectStatus(status);
                }
              }}>
              <title>{`${statusLabel(status)}: ${count} đơn (${percentage(count, total)})`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">{focused ? "Đang xem" : "Hoàn tất"}</span>
          <span className="font-serif text-3xl font-bold text-[#0B2419]">{percentage(selectedCount, total)}</span>
          <span className="max-w-28 text-[11px] text-[#59665E]">{focused ? statusLabel(focused) : `${total.toLocaleString("vi-VN")} đơn trong kỳ`}</span>
        </div>
      </div>
      <div className="grid gap-1.5" aria-label="Chi tiết trạng thái đơn hàng">
        {segments.map(({ status, count }) => {
          const content = <>
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: palette[status] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-left text-xs text-[#424844]">{statusLabel(status)}</span>
            <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-[#0B2419]">
              {count.toLocaleString("vi-VN")} · {percentage(count, total)}
            </span>
          </>;
          const className = "flex w-full items-center gap-2 rounded-md bg-[#F7F8F3] px-2.5 py-2";
          return onSelectStatus
            ? <button key={status} type="button" className={`${className} hover:bg-[#ECF2E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5038]`}
                onClick={() => onSelectStatus(status)} onFocus={() => setFocused(status)} onBlur={() => setFocused(null)}
                onMouseEnter={() => setFocused(status)} onMouseLeave={() => setFocused(null)}>{content}</button>
            : <div key={status} className={className} onMouseEnter={() => setFocused(status)}
                onMouseLeave={() => setFocused(null)}>{content}</div>;
        })}
      </div>
      {total === 0 ? <p role="status" className="report-empty">Chưa có đơn hàng trong khoảng ngày đã chọn.</p> : null}
    </article>
  );
}
