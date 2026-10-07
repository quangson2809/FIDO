import React, { useEffect, useState } from 'react';
import { reportService } from '../../features/report/api/service';
import type { ReportOverviewDto } from '../../features/report/types';
import { getApiErrorMessage } from '../../services/http/apiError';
import { getVietnamMonthStart, getVietnamToday } from '../../shared/time/vietnamCalendar';

const formatMoney = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

export const AdminReportsView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [fromDraft, setFromDraft] = useState(getVietnamMonthStart());
  const [toDraft, setToDraft] = useState(getVietnamToday());
  const [range, setRange] = useState({ from: getVietnamMonthStart(), to: getVietnamToday() });
  const [report, setReport] = useState<ReportOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await reportService.getOverview(range.from, range.to);
        if (!active) return;
        setReport(result);
        setError(null);
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải báo cáo trong khoảng thời gian đã chọn.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [range]);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Report overview</p>
        <h1 className="mt-1 font-serif text-3xl text-[#0B2419]">Báo cáo doanh số</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#606863]">Số liệu lấy trực tiếp từ API báo cáo FIDO. Frontend không tự tính doanh thu, tỷ lệ giao hàng, top sản phẩm hoặc hiệu suất dịch vụ.</p>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); if (fromDraft > toDraft) { showToast('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.'); return; } setLoading(true); setRange({ from: fromDraft, to: toDraft }); }} className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold">Từ ngày<input type="date" value={fromDraft} onChange={(event) => setFromDraft(event.target.value)} className="mt-1 block border border-[#D9DDD6] bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold">Đến ngày<input type="date" value={toDraft} onChange={(event) => setToDraft(event.target.value)} className="mt-1 block border border-[#D9DDD6] bg-white px-3 py-2 text-sm" /></label>
        <button type="submit" className="bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white">Xem báo cáo</button>
      </form>

      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="p-8 text-center text-sm text-[#687069]">Đang tải báo cáo...</div> : report && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="border border-[#E8E9E3] bg-white p-5"><p className="text-xs uppercase text-[#687069]">Doanh số đơn hoàn tất</p><p className="mt-2 font-serif text-2xl font-bold">{formatMoney(report.completed_sales)}</p></article>
            <article className="border border-[#E8E9E3] bg-white p-5"><p className="text-xs uppercase text-[#687069]">Điều chỉnh trả hàng</p><p className="mt-2 font-serif text-2xl font-bold">{formatMoney(report.returned_adjustment)}</p></article>
            <article className="border border-[#E8E9E3] bg-white p-5"><p className="text-xs uppercase text-[#687069]">Doanh số thuần</p><p className="mt-2 font-serif text-2xl font-bold text-[#1B5038]">{formatMoney(report.net_sales)}</p></article>
          </div>
          <div className="border border-[#E8E9E3] bg-white p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-serif text-xl">Số đơn theo trạng thái</h2><p className="mt-1 text-xs text-[#687069]">{report.from} → {report.to}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(report.orders_by_status).map(([status, count]) => <div key={status} className="border border-[#E8E9E3] bg-[#F8FAF4] p-3"><p className="font-mono text-xs font-bold">{status}</p><p className="mt-1 text-2xl font-bold">{count}</p></div>)}</div></div>
        </>
      )}
    </section>
  );
};
