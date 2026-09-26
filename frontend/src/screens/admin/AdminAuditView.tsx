import React, { useState } from 'react';

export const AdminAuditView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const [logs] = useState([
    {
      id: 'LOG-88912',
      operator: 'Admin Lê Hoàng Quân',
      role: 'Master Admin',
      action: 'Xác nhận xuất kho hàng may sẵn cho đơn COD #AV-20241028-088',
      entity: 'Order #AV-20241028-088',
      ip: '113.161.42.18',
      timestamp: '24/09/2026 16:15:32',
      level: 'INFO',
    },
    {
      id: 'LOG-88911',
      operator: 'Kho Thủ Đức (Nguyễn Tuấn)',
      role: 'Logistics Lead',
      action: 'Kiểm đếm hoàn tất phiếu nhập vải #GR-0042 (200 chiếc)',
      entity: 'GoodsReceipt #GR-0042',
      ip: '14.169.88.204',
      timestamp: '24/09/2026 15:58:10',
      level: 'INFO',
    },
    {
      id: 'LOG-88910',
      operator: 'Kế toán Nguyễn Nga',
      role: 'Showroom Accountant',
      action: 'Đối soát thành công 45.200.000₫ bưu cục GHN & Viettel Post',
      entity: 'Reconciliation #REC-102',
      ip: '118.69.12.50',
      timestamp: '24/09/2026 15:20:44',
      level: 'SUCCESS',
    },
    {
      id: 'LOG-88909',
      operator: 'Thợ may Nguyễn Văn Nam',
      role: 'Master Tailor',
      action: 'Cắt ngắn gấu quần 2.5cm cho đơn #ORD-2024-8891 (giữ chỉ vàng)',
      entity: 'TailoringQueue #TL-4401',
      ip: '113.161.42.22',
      timestamp: '24/09/2026 14:40:15',
      level: 'INFO',
    },
    {
      id: 'LOG-88908',
      operator: 'Stylist Vũ Đức Minh',
      role: 'Fashion Stylist',
      action: 'Cập nhật số đo hình thể khách hàng VIP #CUST-0428 (Ống 76cm, Eo 82cm)',
      entity: 'CustomerProfile #CUST-0428',
      ip: '171.244.33.10',
      timestamp: '24/09/2026 11:10:02',
      level: 'INFO',
    },
    {
      id: 'LOG-88907',
      operator: 'Master Admin',
      role: 'System',
      action: 'Cập nhật giá bán biến thể SKU KMD-ST-IND-32 thành 1.950.000₫ (Override)',
      entity: 'ProductVariant #PRD-00102',
      ip: '127.0.0.1 (Internal Service)',
      timestamp: '24/09/2026 09:30:19',
      level: 'WARN',
    },
  ]);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span>Hệ thống Quản trị</span>
            <span>/</span>
            <span>Hệ thống &amp; Phân quyền</span>
            <span>/</span>
            <span className="text-[#0B2419] font-semibold">Nhật ký thao tác (Audit)</span>
          </div>
          <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-[#0B2419] tracking-tight">
            Nhật Ký Thao Tác Hệ Thống (Audit Trail #66)
          </h1>
          <p className="text-xs text-[#687069]">
            Ghi nhận toàn vẹn các hành động thay đổi dữ liệu đơn hàng, điều chỉnh kho, cắt may và phân quyền người dùng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => showToast('Đang trích xuất toàn bộ audit log ra file an toàn...')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider rounded shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Tải Toàn Bộ Nhật Ký
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E9E3] bg-[#FAF9F5] flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#0B2419]">Lịch Sử Sự Kiện Thời Gian Thực</h3>
          <span className="text-xs text-[#687069]">Hiển thị {logs.length} sự kiện gần nhất</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191c19]">
            <thead>
              <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                <th className="py-3 px-4">Thời Gian &amp; ID</th>
                <th className="py-3 px-4">Người Thực Hiện</th>
                <th className="py-3 px-4">Hành Động Chi Tiết</th>
                <th className="py-3 px-4">Thực Thể Liên Quan</th>
                <th className="py-3 px-4">Địa Chỉ IP</th>
                <th className="py-3 px-4 text-center">Mức Độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FAF4DF]/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#0B2419]">{log.timestamp}</div>
                    <div className="text-[10px] text-[#687069] font-mono">{log.id}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#101310]">{log.operator}</div>
                    <div className="text-[10px] text-[#725c00] font-semibold">{log.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#101310] max-w-[320px]">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#0B2419]">
                    {log.entity}
                  </td>
                  <td className="py-3.5 px-4 text-[#687069] font-mono text-[11px]">
                    {log.ip}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {log.level === 'INFO' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f3f4ef] text-[#0B2419]">
                        INFO
                      </span>
                    )}
                    {log.level === 'SUCCESS' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#cde9d8] text-[#1B5038]">
                        SUCCESS
                      </span>
                    )}
                    {log.level === 'WARN' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF4DF] text-[#725c00]">
                        WARN
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
