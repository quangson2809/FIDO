import React, { useState } from 'react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: 'DIAMOND' | 'PLATINUM' | 'GOLD' | 'STANDARD';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  measurements?: {
    height: number; // cm
    weight: number; // kg
    waist: number; // cm
    inseam: number; // Chiều dài ống quần trong (cm)
    chest: number; // cm
  };
  notes: string;
}

export const AdminCustomersView: React.FC<{
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [customers] = useState<Customer[]>([
    {
      id: 'CUS-8801',
      name: 'Nguyễn Hải Đăng',
      phone: '0912 345 678',
      email: 'haidang.nguyen@vinacap.vn',
      tier: 'DIAMOND',
      totalOrders: 14,
      totalSpent: 38500000,
      lastOrderDate: '24/09/2026',
      measurements: {
        height: 178,
        weight: 73,
        waist: 82,
        inseam: 76,
        chest: 98,
      },
      notes: 'Thích mặc quần Jeans cạp cao vừa chạm mắt cá chân, ống rộng 19cm. Luôn yêu cầu cắt ngắn 2.5cm.',
    },
    {
      id: 'CUS-8802',
      name: 'Trần Minh Triết',
      phone: '0988 776 655',
      email: 'triet.tran@architect.com',
      tier: 'PLATINUM',
      totalOrders: 8,
      totalSpent: 21900000,
      lastOrderDate: '25/09/2026',
      measurements: {
        height: 175,
        weight: 68,
        waist: 79,
        inseam: 74,
        chest: 94,
      },
      notes: 'Khách quen Showroom Lý Tự Trọng. Thường chọn sơ mi cổ Cuban và may gấu lật 4cm quần Tây.',
    },
    {
      id: 'CUS-8803',
      name: 'Lê Hoàng Long',
      phone: '0903 112 233',
      email: 'long.le@techcorp.io',
      tier: 'GOLD',
      totalOrders: 5,
      totalSpent: 12450000,
      lastOrderDate: '20/09/2026',
      measurements: {
        height: 182,
        weight: 78,
        waist: 85,
        inseam: 80,
        chest: 102,
      },
      notes: 'Giao hàng giờ hành chính tại tòa nhà Landmark 81. Yêu cầu kiểm tra kỹ chất vải linen trước khi thanh toán COD.',
    },
    {
      id: 'CUS-8804',
      name: 'Phạm Đức Anh',
      phone: '0979 888 999',
      email: 'ducanh.pham@lawfirm.vn',
      tier: 'STANDARD',
      totalOrders: 2,
      totalSpent: 3980000,
      lastOrderDate: '15/09/2026',
      measurements: {
        height: 170,
        weight: 65,
        waist: 76,
        inseam: 71,
        chest: 90,
      },
      notes: 'Khách hàng mới trải nghiệm dòng áo Polo Mercerized.',
    },
  ]);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = tierFilter === 'all' || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>Hồ sơ khách hàng VIP &bull; Tích hợp sổ may đo Atelier</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
            Quản Lý Khách Hàng (CRM) &amp; Sổ May Đo
          </h1>
          <p className="text-sm text-[#424844] max-w-3xl">
            Lưu trữ thông tin liên hệ, lịch sử đặt hàng COD, hạng hội viên và số đo hình thể riêng để thợ may tự động canh gấu chuẩn xác mỗi lần mua.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Mở form nhập hồ sơ khách hàng mới')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] text-white hover:bg-[#1B5038] transition-colors text-xs font-semibold uppercase tracking-wider rounded shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Thêm Khách Hàng Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#687069]">Tổng Khách VIP</span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            2,480 <span className="text-xs font-sans font-normal text-[#687069]">hội viên</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">+124 khách mới tháng này</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#725C00]">Hội Viên Diamond</span>
          <div className="mt-2 text-3xl font-bold text-[#725C00] font-['Playfair_Display',serif]">
            156 <span className="text-xs font-sans font-normal text-[#687069]">khách</span>
          </div>
          <div className="mt-2 text-xs text-[#687069]">Chi tiêu trên 30.000.000₫</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B2419]">Đã Lưu Sổ May Đo</span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            84% <span className="text-xs font-sans font-normal text-[#687069]">có số đo</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">Tự động canh gấu khi đặt hàng</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#687069]">Giá Trị Đơn Trung Bình</span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            2.85M <span className="text-xs font-sans font-normal text-[#687069]">₫/đơn</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">+8% so với năm 2025</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#F0F2ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#687069]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm tên khách hàng, số điện thoại, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
              />
            </div>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-[#FAF9F5] border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
            >
              <option value="all">Tất cả hạng hội viên</option>
              <option value="DIAMOND">Diamond (Kim Cương)</option>
              <option value="PLATINUM">Platinum (Bạch Kim)</option>
              <option value="GOLD">Gold (Vàng)</option>
              <option value="STANDARD">Standard (Chuẩn)</option>
            </select>
          </div>

          <div className="text-xs text-[#687069]">
            Hiển thị <strong>{filtered.length}</strong> khách hàng
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#424844]">
            <thead className="bg-[#FAF9F5] text-[#687069] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8E9E3]">
              <tr>
                <th className="py-3 px-4">Mã &amp; Họ Tên</th>
                <th className="py-3 px-4">Hạng Hội Viên</th>
                <th className="py-3 px-4">Liên Hệ</th>
                <th className="py-3 px-4 text-center">Tổng Đơn</th>
                <th className="py-3 px-4 text-right">Tổng Chi Tiêu</th>
                <th className="py-3 px-4">Sổ May Đo</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2ED]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0B2419] text-sm">{c.name}</div>
                    <div className="font-mono text-[10px] text-[#687069]">{c.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    {c.tier === 'DIAMOND' && (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#0B2419] text-[#E5C358]">
                        DIAMOND VIP
                      </span>
                    )}
                    {c.tier === 'PLATINUM' && (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#687069]/20 text-[#0B2419]">
                        PLATINUM
                      </span>
                    )}
                    {c.tier === 'GOLD' && (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#E5C358]/30 text-[#725C00]">
                        GOLD
                      </span>
                    )}
                    {c.tier === 'STANDARD' && (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FAF9F5] text-[#687069] border border-[#E8E9E3]">
                        STANDARD
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#0B2419]">{c.phone}</div>
                    <div className="text-[11px] text-[#687069]">{c.email}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#0B2419]">{c.totalOrders}</td>
                  <td className="py-3 px-4 text-right font-bold text-[#0B2419] text-sm">
                    {c.totalSpent.toLocaleString('vi-VN')}₫
                  </td>
                  <td className="py-3 px-4">
                    {c.measurements ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#1B5038] font-semibold bg-[#1B5038]/10 px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[14px]">straighten</span>
                        Ống {c.measurements.inseam}cm &bull; Eo {c.measurements.waist}cm
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#687069]">Chưa lấy số đo</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedCustomer(c)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0B2419] hover:bg-[#0B2419]/5 rounded border border-[#E8E9E3]"
                    >
                      Hồ sơ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E9E3] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2ED] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#0B2419]">{selectedCustomer.name}</h3>
                <span className="text-xs text-[#687069]">
                  Mã KH: {selectedCustomer.id} &bull; Hạng: {selectedCustomer.tier}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[#687069] hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF9F5] p-3 rounded border border-[#E8E9E3]">
              <div>
                <span className="text-[#687069]">Số điện thoại:</span>
                <p className="font-bold text-[#0B2419]">{selectedCustomer.phone}</p>
              </div>
              <div>
                <span className="text-[#687069]">Email:</span>
                <p className="font-bold text-[#0B2419]">{selectedCustomer.email}</p>
              </div>
              <div>
                <span className="text-[#687069]">Tổng chi tiêu:</span>
                <p className="font-bold text-[#1B5038] text-sm">
                  {selectedCustomer.totalSpent.toLocaleString('vi-VN')}₫
                </p>
              </div>
              <div>
                <span className="text-[#687069]">Số đơn hoàn tất:</span>
                <p className="font-bold text-[#0B2419]">{selectedCustomer.totalOrders} đơn hàng</p>
              </div>
            </div>

            {/* Sổ May Đo Atelier */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#0B2419] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#725C00]">straighten</span>
                <span>Thông Số May Đo Riêng (Atelier Vert Profile)</span>
              </h4>
              {selectedCustomer.measurements ? (
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-2 bg-[#F0F2ED] rounded">
                    <span className="text-[10px] text-[#687069] block">Chiều cao</span>
                    <strong className="text-[#0B2419]">{selectedCustomer.measurements.height} cm</strong>
                  </div>
                  <div className="p-2 bg-[#F0F2ED] rounded">
                    <span className="text-[10px] text-[#687069] block">Cân nặng</span>
                    <strong className="text-[#0B2419]">{selectedCustomer.measurements.weight} kg</strong>
                  </div>
                  <div className="p-2 bg-[#F0F2ED] rounded">
                    <span className="text-[10px] text-[#687069] block">Vòng eo</span>
                    <strong className="text-[#0B2419]">{selectedCustomer.measurements.waist} cm</strong>
                  </div>
                  <div className="p-2 bg-[#E5C358]/20 rounded border border-[#E5C358]/50">
                    <span className="text-[10px] text-[#725C00] font-bold block">Độ dài ống</span>
                    <strong className="text-[#725C00]">{selectedCustomer.measurements.inseam} cm</strong>
                  </div>
                  <div className="p-2 bg-[#F0F2ED] rounded">
                    <span className="text-[10px] text-[#687069] block">Vòng ngực</span>
                    <strong className="text-[#0B2419]">{selectedCustomer.measurements.chest} cm</strong>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#687069]">Chưa có thông số đo.</p>
              )}
            </div>

            {/* Ghi chú may mặc */}
            <div className="p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] text-xs">
              <span className="font-bold text-[#0B2419] block mb-1">Ghi Chú Thợ May &amp; Sở Thích:</span>
              <p className="text-[#424844]">{selectedCustomer.notes}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 border border-[#E8E9E3] rounded text-xs text-[#687069] hover:bg-[#FAF9F5]"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  if (onNavigateTab) {
                    onNavigateTab('customer-detail', `Hồ sơ ${selectedCustomer.name}`);
                  }
                }}
                className="px-4 py-2 border border-[#0B2419] rounded text-xs font-semibold text-[#0B2419] hover:bg-[#0B2419]/5"
              >
                Mở Trang Hồ Sơ Chi Tiết
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Đã đồng bộ số đo khách hàng ${selectedCustomer.name} vào hệ thống xưởng may!`);
                  setSelectedCustomer(null);
                }}
                className="px-5 py-2 bg-[#0B2419] text-[#E5C358] text-xs font-bold rounded hover:bg-[#123A29]"
              >
                Lưu Thay Đổi Số Đo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
