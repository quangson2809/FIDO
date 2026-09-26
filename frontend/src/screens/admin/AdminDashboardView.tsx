import React from 'react';
import {
  mockAuditLogs,
  mockInventoryRows,
  mockOrderDetails,
  mockReportOverview,
} from '../../mocks/apiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const AdminDashboardView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab, showToast }) => {
  const lowStock = mockInventoryRows.filter((row) => row.available_quantity <= 5);
  const activeOrders = mockOrderDetails.filter((order) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERY_FAILED'].includes(order.order_status),
  );

  return (
    <div className="flex flex-col w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">
            Mock data · API contract baseline
          </div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">
            Tổng quan vận hành
          </h1>
          <p className="text-sm text-[#687069] mt-1">
            Dữ liệu được dẫn xuất từ ReportOverviewDto, Order, Inventory và Audit mock.
          </p>
        </div>
        <button
          onClick={() => showToast('Đã làm mới bộ dữ liệu mock')}
          className="px-4 py-2 bg-white border border-[#E8E9E3] text-xs font-bold text-[#0B2419] rounded"
        >
          Làm mới mock
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ['Doanh số COMPLETED', money(mockReportOverview.completed_sales), 'payments'],
          ['Điều chỉnh RETURNED', '-' + money(mockReportOverview.returned_adjustment), 'undo'],
          ['Doanh thu thuần', money(mockReportOverview.net_sales), 'account_balance_wallet'],
          ['Đơn đang vận hành', String(activeOrders.length), 'local_shipping'],
        ].map(([label, value, icon]) => (
          <div key={label} className="bg-white border border-[#E8E9E3] rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">{label}</span>
              <span className="material-symbols-outlined text-[#1B5038]">{icon}</span>
            </div>
            <div className="mt-3 text-2xl font-bold text-[#0B2419]">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white border border-[#E8E9E3] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E9E3] flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#0B2419]">Đơn hàng gần đây</h2>
              <p className="text-xs text-[#687069]">Bao phủ đầy đủ các nhánh trạng thái để test UI.</p>
            </div>
            <button onClick={() => onNavigateTab('orders', 'Quản lý Đơn hàng')} className="text-xs font-bold text-[#1B5038]">
              Xem tất cả
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F5F6F2] text-[#687069]">
                <tr><th className="text-left px-4 py-3">Mã đơn</th><th>Trạng thái</th><th>Thanh toán</th><th className="text-right px-4">Tổng</th></tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9E3]">
                {mockOrderDetails.slice(0, 6).map((order) => (
                  <tr key={order.order_id} className="hover:bg-[#FAF9F5]">
                    <td className="px-4 py-3 font-mono font-bold">{order.order_code}</td>
                    <td className="text-center">{order.order_status}</td>
                    <td className="text-center">{order.payment.payment_status}</td>
                    <td className="px-4 text-right font-bold">{money(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-[#E8E9E3] rounded-lg p-5">
          <h2 className="font-bold text-[#0B2419]">Đơn theo trạng thái</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(mockReportOverview.orders_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-xs border-b border-[#F0F2ED] pb-2">
                <span className="font-medium text-[#424844]">{status}</span>
                <span className="font-bold text-[#0B2419]">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white border border-[#E8E9E3] rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-[#0B2419]">Tồn kho cần chú ý</h2>
              <p className="text-xs text-[#687069]">Ngưỡng hiển thị mock: available_quantity ≤ 5.</p>
            </div>
            <button onClick={() => onNavigateTab('inventory', 'Tồn kho')} className="text-xs font-bold text-[#1B5038]">Mở kho</button>
          </div>
          <div className="mt-4 space-y-3">
            {lowStock.length ? lowStock.map((row) => (
              <div key={row.variant_id} className="flex justify-between text-xs bg-[#FAF9F5] p-3 rounded">
                <div><div className="font-bold">{row.product_name}</div><div className="text-[#687069]">{row.sku} · {row.size} · {row.color}</div></div>
                <span className="font-bold text-[#BA1A1A]">{row.available_quantity}</span>
              </div>
            )) : <p className="text-xs text-[#687069]">Không có variant ở mức cảnh báo.</p>}
          </div>
        </section>

        <section className="bg-white border border-[#E8E9E3] rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-[#0B2419]">Audit gần nhất</h2>
              <p className="text-xs text-[#687069]">Actor/action/target/time đúng cấu trúc AuditLogDto.</p>
            </div>
            <button onClick={() => onNavigateTab('audit', 'Nhật ký thao tác (Audit)')} className="text-xs font-bold text-[#1B5038]">Xem audit</button>
          </div>
          <div className="mt-4 space-y-3">
            {mockAuditLogs.slice(0, 4).map((log) => (
              <div key={log.audit_id} className="text-xs border-b border-[#F0F2ED] pb-3">
                <div className="font-bold text-[#0B2419]">{log.action}</div>
                <div className="text-[#687069]">Account #{log.actor_account_id} · {log.target_type} #{log.target_id}</div>
                <div className="text-[10px] text-[#8A918C] mt-1">{log.created_at}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
