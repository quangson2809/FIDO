import React, { useState } from 'react';

interface PermissionMatrix {
  id: string;
  name: string;
  description: string;
  admin: boolean;
  showroomManager: boolean;
  masterTailor: boolean;
  logisticsLead: boolean;
  stylist: boolean;
}

export const AdminRolesView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const [matrix, setMatrix] = useState<PermissionMatrix[]>([
    {
      id: 'p1',
      name: 'Duyệt & Đổi trạng thái đơn bưu kiện COD',
      description: 'Chuyển đơn từ Chờ duyệt sang Đang chuẩn bị / Đang giao',
      admin: true,
      showroomManager: true,
      masterTailor: false,
      logisticsLead: true,
      stylist: false,
    },
    {
      id: 'p2',
      name: 'Chỉnh sửa thông tin người nhận & Địa chỉ giao',
      description: 'Sửa số điện thoại, ghi chú giao hàng, khung giờ nhận',
      admin: true,
      showroomManager: true,
      masterTailor: false,
      logisticsLead: true,
      stylist: true,
    },
    {
      id: 'p3',
      name: 'Tiếp nhận & Cập nhật hàng đợi may lên gấu',
      description: 'Chỉ định thợ may phụ trách, xác nhận hoàn thiện lên gấu',
      admin: true,
      showroomManager: true,
      masterTailor: true,
      logisticsLead: false,
      stylist: false,
    },
    {
      id: 'p4',
      name: 'Quản lý Sản phẩm, Giá bán & Biến thể',
      description: 'Tạo sản phẩm mới, cập nhật giá niêm yết, bật/tắt mở bán',
      admin: true,
      showroomManager: true,
      masterTailor: false,
      logisticsLead: false,
      stylist: false,
    },
    {
      id: 'p5',
      name: 'Kiểm kê & Điều chỉnh tồn kho',
      description: 'Tăng giảm số lượng tồn kho thực tế, nhập kho lô mới',
      admin: true,
      showroomManager: true,
      masterTailor: false,
      logisticsLead: true,
      stylist: false,
    },
    {
      id: 'p6',
      name: 'Xem & Cập nhật số đo khách hàng VIP',
      description: 'Lưu thông số vòng eo, độ dài ống quần khách hàng',
      admin: true,
      showroomManager: true,
      masterTailor: true,
      logisticsLead: false,
      stylist: true,
    },
    {
      id: 'p7',
      name: 'Xem báo cáo tài chính & Doanh thu COD',
      description: 'Xem tổng doanh số, tỷ lệ thu tiền COD thành công',
      admin: true,
      showroomManager: true,
      masterTailor: false,
      logisticsLead: false,
      stylist: false,
    },
    {
      id: 'p8',
      name: 'Cấu hình hệ thống & Phân quyền',
      description: 'Thêm bớt quyền, cài đặt máy chủ Atelier Vert',
      admin: true,
      showroomManager: false,
      masterTailor: false,
      logisticsLead: false,
      stylist: false,
    },
  ]);

  const togglePerm = (
    id: string,
    roleKey: 'admin' | 'showroomManager' | 'masterTailor' | 'logisticsLead' | 'stylist'
  ) => {
    if (roleKey === 'admin') {
      showToast('Không thể tước quyền tối cao của Quản Trị Viên (Super Admin)');
      return;
    }
    setMatrix((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [roleKey]: !row[roleKey] } : row))
    );
    showToast('Đã lưu thay đổi ma trận phân quyền RBAC thành công!');
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
            Phân Quyền Vai Trò &amp; Bảo Mật Hệ Thống (RBAC)
          </h1>
          <p className="text-sm text-[#424844] max-w-3xl">
            Thiết lập quyền thao tác chi tiết cho từng nhóm tài khoản: Quản trị viên, Quản lý Showroom, Thợ may trưởng xưởng và Chuyên viên giao nhận COD.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Tất cả quyền hạn đã được đồng bộ với phiên đăng nhập của nhân viên')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] text-[#E5C358] hover:bg-[#123A29] transition-colors text-xs font-bold uppercase tracking-wider rounded shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Đồng Bộ Quyền Hạn</span>
          </button>
        </div>
      </div>

      {/* Roles Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-lg border border-[#E8E9E3] shadow-xs">
          <div className="text-[10px] font-bold text-[#E5C358] bg-[#0B2419] px-2 py-0.5 rounded inline-block uppercase">
            Admin
          </div>
          <div className="mt-2 font-bold text-[#0B2419] text-sm">Quản Trị Tối Cao</div>
          <p className="text-[11px] text-[#687069] mt-1">Toàn quyền toàn hệ thống</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E8E9E3] shadow-xs">
          <div className="text-[10px] font-bold text-[#0B2419] bg-[#0B2419]/10 px-2 py-0.5 rounded inline-block uppercase">
            Manager
          </div>
          <div className="mt-2 font-bold text-[#0B2419] text-sm">Quản Lý Showroom</div>
          <p className="text-[11px] text-[#687069] mt-1">Vận hành bán lẻ &amp; kho</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E8E9E3] shadow-xs">
          <div className="text-[10px] font-bold text-[#725C00] bg-[#E5C358]/20 px-2 py-0.5 rounded inline-block uppercase">
            Tailor
          </div>
          <div className="mt-2 font-bold text-[#0B2419] text-sm">Thợ May Trưởng</div>
          <p className="text-[11px] text-[#687069] mt-1">Xử lý cắt may &amp; số đo</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E8E9E3] shadow-xs">
          <div className="text-[10px] font-bold text-[#424844] bg-[#687069]/15 px-2 py-0.5 rounded inline-block uppercase">
            Logistics
          </div>
          <div className="mt-2 font-bold text-[#0B2419] text-sm">Điều Phối COD</div>
          <p className="text-[11px] text-[#687069] mt-1">Đóng gói &amp; giao nhận</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E8E9E3] shadow-xs">
          <div className="text-[10px] font-bold text-[#1B5038] bg-[#1B5038]/10 px-2 py-0.5 rounded inline-block uppercase">
            Stylist
          </div>
          <div className="mt-2 font-bold text-[#0B2419] text-sm">Stylist / Bán Hàng</div>
          <p className="text-[11px] text-[#687069] mt-1">Fitting &amp; tư vấn khách</p>
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#F0F2ED]">
          <h3 className="text-base font-bold text-[#0B2419]">Ma Trận Thao Tác Nghiệp Vụ</h3>
          <p className="text-xs text-[#687069]">Bấm trực tiếp vào ô để cấp hoặc thu hồi quyền truy cập</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#424844]">
            <thead className="bg-[#FAF9F5] text-[#687069] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8E9E3]">
              <tr>
                <th className="py-3 px-4 w-2/5">Chức Năng &amp; Quyền Hạn</th>
                <th className="py-3 px-4 text-center">Quản Trị Viên</th>
                <th className="py-3 px-4 text-center">Quản Lý Showroom</th>
                <th className="py-3 px-4 text-center">Thợ May Xưởng</th>
                <th className="py-3 px-4 text-center">Điều Phối COD</th>
                <th className="py-3 px-4 text-center">Stylist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2ED]">
              {matrix.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0B2419]">{row.name}</div>
                    <div className="text-[11px] text-[#687069]">{row.description}</div>
                  </td>

                  {/* Admin */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePerm(row.id, 'admin')}
                      className="w-6 h-6 rounded bg-[#0B2419] text-[#E5C358] inline-flex items-center justify-center font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                  </td>

                  {/* Showroom Manager */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePerm(row.id, 'showroomManager')}
                      className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                        row.showroomManager
                          ? 'bg-[#1B5038] text-white'
                          : 'bg-[#F0F2ED] text-[#A3AAA5] hover:bg-[#E8E9E3]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {row.showroomManager ? 'check' : 'close'}
                      </span>
                    </button>
                  </td>

                  {/* Master Tailor */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePerm(row.id, 'masterTailor')}
                      className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                        row.masterTailor
                          ? 'bg-[#725C00] text-white'
                          : 'bg-[#F0F2ED] text-[#A3AAA5] hover:bg-[#E8E9E3]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {row.masterTailor ? 'check' : 'close'}
                      </span>
                    </button>
                  </td>

                  {/* Logistics Lead */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePerm(row.id, 'logisticsLead')}
                      className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                        row.logisticsLead
                          ? 'bg-[#0B2419] text-white'
                          : 'bg-[#F0F2ED] text-[#A3AAA5] hover:bg-[#E8E9E3]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {row.logisticsLead ? 'check' : 'close'}
                      </span>
                    </button>
                  </td>

                  {/* Stylist */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePerm(row.id, 'stylist')}
                      className={`w-6 h-6 rounded inline-flex items-center justify-center transition-colors ${
                        row.stylist
                          ? 'bg-[#1B5038] text-white'
                          : 'bg-[#F0F2ED] text-[#A3AAA5] hover:bg-[#E8E9E3]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {row.stylist ? 'check' : 'close'}
                      </span>
                    </button>
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
