import React from 'react';
import { mockReportOverview } from '../../mocks/apiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const AdminReportsView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => (
  <div className="space-y-6">
    <div className="flex flex-col lg:flex-row justify-between gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">ReportOverviewDto</div>
        <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Báo cáo tổng quan</h1>
        <p className="text-sm text-[#687069]">Mock chỉ hiển thị phạm vi ngày, doanh số COMPLETED, điều chỉnh RETURNED, net sales và số đơn theo trạng thái.</p>
      </div>
      <button onClick={()=>showToast('Mock GET /api/v1/admin/reports/overview?from=...&to=...')} className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded self-start">Làm mới báo cáo</button>
    </div>

    <div className="text-xs bg-[#FAF4DF] border border-[#E8C75B]/40 rounded p-3">Kỳ mock: <strong>{mockReportOverview.from}</strong> → <strong>{mockReportOverview.to}</strong></div>

    <div className="grid sm:grid-cols-3 gap-4">
      <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">completed_sales</div><div className="text-2xl font-bold text-[#0B2419] mt-2">{money(mockReportOverview.completed_sales)}</div></div>
      <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">returned_adjustment</div><div className="text-2xl font-bold text-[#BA1A1A] mt-2">-{money(mockReportOverview.returned_adjustment)}</div></div>
      <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">net_sales</div><div className="text-2xl font-bold text-[#1B5038] mt-2">{money(mockReportOverview.net_sales)}</div></div>
    </div>

    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="p-4 border-b font-bold text-[#0B2419]">orders_by_status</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E8E9E3]">
        {Object.entries(mockReportOverview.orders_by_status).map(([status,count])=>(
          <div key={status} className="bg-white p-5"><div className="text-xs text-[#687069]">{status}</div><div className="text-3xl font-bold mt-1">{count}</div></div>
        ))}
      </div>
    </div>
  </div>
);
