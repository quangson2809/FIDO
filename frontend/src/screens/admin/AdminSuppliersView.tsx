import React, { useState } from 'react';

interface SupplierItem {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  note: string;
}

export const AdminSuppliersView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
}> = ({ showToast, onNavigateTab }) => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([
    {
      id: 'SUP-101',
      name: 'Kurabo Denim Mills Japan',
      type: 'Xưởng dệt Denim Kojima',
      phone: '+81 86 472 2011',
      email: 'international-sales@kurabo.co.jp',
      address: 'Okayama, Japan',
      status: 'ACTIVE',
      note: 'Selvedge Denim 13.5oz sợi bông Zimbabwe; 100% shuttle loom.',
    },
    {
      id: 'SUP-102',
      name: 'Albini Group S.p.A',
      type: 'Nhà dệt sơ mi Ý cao cấp',
      phone: '+39 035 777 111',
      email: 'orders@albinigroup.com',
      address: 'Albino, Bergamo',
      status: 'ACTIVE',
      note: 'Chuyên vải 100% Linen dệt thoáng mát & Cotton Ai Cập 120/2.',
    },
    {
      id: 'SUP-103',
      name: 'Loro Piana Heritage Wool',
      type: 'Xưởng len & dạ may đo',
      phone: '+39 0163 2011',
      email: 'textile-supply@loropiana.com',
      address: 'Quarona, Vercelli',
      status: 'ACTIVE',
      note: 'Len cừu Merino & Tasmanian Wool Super 150s cho dòng Blazer RTW.',
    },
    {
      id: 'SUP-104',
      name: 'Canclini 1925 Fabric',
      type: 'Vải Flannel & Shirting',
      phone: '+39 031 352 911',
      email: 'info@canclini.it',
      address: 'Guanzate, Como',
      status: 'PAUSED',
      note: 'Đang rà soát lại đơn giá kỳ Thu Đông; dự kiến tái hợp tác tháng 11.',
    },
    {
      id: 'SUP-105',
      name: 'Xưởng Dệt Sartorial Sài Gòn',
      type: 'Gia công RTW & Phụ liệu cúc',
      phone: '028 3844 8990',
      email: 'contact@sartorialsaigon.vn',
      address: 'Tân Bình, TP.HCM',
      status: 'ACTIVE',
      note: 'Cung cấp cúc sừng tự nhiên, khóa đồng mộc và dựng phom canvas.',
    },
    {
      id: 'SUP-106',
      name: 'Đồng Phát Packaging & Box',
      type: 'Hộp cứng & Túi đựng lookbook',
      phone: '028 3755 2211',
      email: 'sales@dongphatbox.vn',
      address: 'Bình Tân, TP.HCM',
      status: 'INACTIVE',
      note: 'Hết hạn hợp đồng bao bì năm 2025; chuyển nhà thầu mới.',
    },
  ]);

  // Form input state
  const [formName, setFormName] = useState('Kurabo Denim Mills Japan');
  const [formPhone, setFormPhone] = useState('+81 86 472 2011');
  const [formEmail, setFormEmail] = useState('international-sales@kurabo.co.jp');
  const [formAddress, setFormAddress] = useState('Kojima, Kurashiki, Okayama Prefecture 711-8588, Japan');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'PAUSED' | 'INACTIVE'>('ACTIVE');
  const [formNote, setFormNote] = useState(
    'Cung ứng độc quyền vải Selvedge Denim 13.5oz & 14oz dệt con thoi cổ điển. Tiêu chuẩn sợi 100% Zimbabwe Cotton. Thời hạn đặt hàng trước 20 ngày.'
  );

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const newId = `SUP-${100 + suppliers.length + 1}`;
    const newSup: SupplierItem = {
      id: newId,
      name: formName.trim(),
      type: 'Xưởng dệt hợp tác',
      phone: formPhone.trim(),
      email: formEmail.trim(),
      address: formAddress.trim(),
      status: formStatus,
      note: formNote.trim(),
    };
    setSuppliers([newSup, ...suppliers]);
    showToast(`Đã lưu nhà cung cấp mới "${newSup.name}" (Mã ${newId})!`);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* 1. Breadcrumb & Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span>Hệ thống Quản trị</span>
            <span>/</span>
            <span>Kho &amp; Vận hành</span>
            <span>/</span>
            <span className="text-[#0B2419] font-semibold">Nhà cung cấp</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-[#0B2419] tracking-tight">
              Quản lý Nhà cung cấp
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold tracking-wider uppercase border border-[#E5C358]/40">
              API #46 - #49 • SUPPLIER DTO
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#edeee9] text-[#1B5038] text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
              MASTER VENDOR REGISTRY
            </div>
          </div>
          <p className="text-xs text-[#687069]">
            Quản lý hồ sơ đối tác xưởng dệt, nhà cung cấp vải &amp; phụ liệu phục vụ chuỗi cung ứng Ready-to-Wear Atelier Vert.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => showToast('Dữ liệu nhà cung cấp đã được đồng bộ mới nhất.')}
            className="px-3.5 py-2 rounded bg-white border border-[#E8E9E3] hover:bg-[#f3f4ef] text-[#0B2419] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Làm mới dữ liệu
          </button>
          <button
            type="button"
            onClick={() => showToast('Đang xuất danh sách nhà cung cấp ra file Excel (.xlsx)...')}
            className="px-3.5 py-2 rounded bg-white border border-[#E8E9E3] hover:bg-[#f3f4ef] text-[#0B2419] text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Xuất Excel / CSV
          </button>
          <button
            type="button"
            onClick={() => {
              document.getElementById('supplier_name_input')?.focus();
              showToast('Cuộn lên biểu mẫu để thêm nhà cung cấp mới');
            }}
            className="px-4 py-2 rounded bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            + Thêm NCC Mới (POST #48)
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Tổng Nhà Cung Cấp</p>
            <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-1">
              16 <span className="font-sans text-xs font-normal text-[#687069]">Đối tác</span>
            </h3>
            <p className="text-[11px] text-[#1B5038] mt-1 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span> 14 Đang hợp tác • 2 Tạm ngưng
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF4DF] text-[#0B2419] flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">factory</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Đợt Nhập Trong Tháng</p>
            <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-1">
              28 <span className="font-sans text-xs font-normal text-[#687069]">Phiếu nhập</span>
            </h3>
            <p className="text-[11px] text-[#1B5038] mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Tăng +14.2% so với tháng trước
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#edeee9] text-[#0B2419] flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">inventory</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Giá Trị Nhập Lũy Kế</p>
            <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-1">
              3.420.000.000 ₫
            </h3>
            <p className="text-[11px] text-[#687069] mt-1 font-medium">Kỳ tài chính Q3/2026</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF4DF] text-[#0B2419] flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Chuẩn Mực Chất Lượng</p>
            <h3 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-1">99.2%</h3>
            <p className="text-[11px] text-[#1B5038] mt-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span> Vải dệt &amp; phụ liệu đạt kiểm định
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#edeee9] text-[#0B2419] flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E9E3] pb-3 text-xs">
        <button
          type="button"
          className="px-4 py-2 rounded font-bold bg-[#0B2419] text-white flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">handshake</span>
          <span>Nhà Cung Cấp (Suppliers)</span>
          <span className="px-1.5 py-0.2 bg-[#E5C358] text-[#111814] rounded-full text-[10px] font-bold">
            {suppliers.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('phieu-nhap-kho', 'Phiếu nhập kho')}
          className="px-4 py-2 rounded font-medium text-[#424844] hover:bg-[#f3f4ef] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Phiếu Nhập Kho (Goods Receipts)</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('ton-kho', 'Tồn kho')}
          className="px-4 py-2 rounded font-medium text-[#424844] hover:bg-[#f3f4ef] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          <span>Tồn Kho Hiện Tại</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('lich-su-bien-dong', 'Lịch sử biến động')}
          className="px-4 py-2 rounded font-medium text-[#424844] hover:bg-[#f3f4ef] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
          <span>Lịch Sử Biến Động</span>
        </button>
      </div>

      {/* 4. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Nhà Cung Cấp (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-[#E8E9E3] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E9E3] pb-3">
            <div>
              <h2 className="font-bold text-base text-[#0B2419]">Thông Tin Nhà Cung Cấp</h2>
              <p className="text-[11px] text-[#687069] mt-0.5">Tạo mới hoặc cập nhật hồ sơ nhà cung cấp</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold uppercase tracking-wider border border-[#E5C358]/40">
              POST #48 / PATCH #49
            </span>
          </div>

          <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Tên Nhà Cung Cấp <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                id="supplier_name_input"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Vd: Kurabo Denim Mills Co., Ltd"
                className="w-full px-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2419] text-[#191c19] font-semibold"
              />
              <p className="text-[10px] text-[#687069] mt-1">Trường `name` [bắt buộc] trong SupplierDto.</p>
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Số Điện Thoại
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#687069] text-[16px]">call</span>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2419]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Hòm Thư Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#687069] text-[16px]">mail</span>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2419]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Địa Chỉ Nhà Xưởng / Văn Phòng
              </label>
              <textarea
                rows={2}
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2419]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Trạng Thái Sử Dụng <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none font-bold text-[#0B2419]"
              >
                <option value="ACTIVE">● Đang hợp tác (ACTIVE)</option>
                <option value="PAUSED">● Tạm ngưng nhập hàng (PAUSED)</option>
                <option value="INACTIVE">● Ngừng giao dịch (INACTIVE)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Ghi Chú &amp; Tiêu Chuẩn Kỹ Thuật
              </label>
              <textarea
                rows={3}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="w-full px-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded bg-[#0B2419] hover:bg-[#1B5038] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                LƯU NHÀ CUNG CẤP (SUBMIT)
              </button>
            </div>
          </form>
        </div>

        {/* Bảng Danh Sách Đối Tác (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Bar Card */}
          <div className="bg-white p-4 rounded-lg border border-[#E8E9E3] shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-wider font-bold text-[#0B2419] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#1B5038]">filter_alt</span>
                Bộ Lọc Tìm Kiếm Đối Tác (API #46)
              </h3>
              <span className="text-[11px] text-[#687069]">
                Hiển thị {filteredSuppliers.length}/{suppliers.length} bản ghi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-8">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#687069]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm tên nhà cung cấp, email, SĐT, địa chỉ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2419]"
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f4ef] border border-[#E8E9E3] rounded focus:bg-white focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
                  <option value="PAUSED">Tạm ngưng (PAUSED)</option>
                  <option value="INACTIVE">Ngừng giao dịch (INACTIVE)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF9F5] border-b border-[#E8E9E3] text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                    <th className="py-3 px-4">Tên Nhà Cung Cấp</th>
                    <th className="py-3 px-3">Điện Thoại / Email</th>
                    <th className="py-3 px-3">Địa Chỉ &amp; Quốc Gia</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3">Ghi Chú Nghiệp Vụ</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3]">
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF4DF]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0B2419]">{s.name}</div>
                        <div className="text-[11px] text-[#687069] flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-semibold">#{s.id}</span>
                          <span>•</span>
                          <span>{s.type}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-[#101310] font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-[#687069]">call</span>
                          <span>{s.phone}</span>
                        </div>
                        <div className="text-[#687069] truncate max-w-[150px] flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[14px] text-[#687069]">mail</span>
                          <span title={s.email}>{s.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-[#101310]">{s.address}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-[#f3f4ef] text-[#0B2419] font-bold border border-[#E8E9E3]">
                          Nhà cung cấp
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {s.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#cde9d8] text-[#072015]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                            Đang hợp tác
                          </span>
                        )}
                        {s.status === 'PAUSED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4DF] text-[#725c00]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E5C358]"></span>
                            Tạm ngưng
                          </span>
                        )}
                        {s.status === 'INACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                            Ngừng giao dịch
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-[#687069] max-w-[180px]">
                        <p className="line-clamp-2" title={s.note}>
                          {s.note}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFormName(s.name);
                              setFormPhone(s.phone);
                              setFormEmail(s.email);
                              setFormAddress(s.address);
                              setFormStatus(s.status);
                              setFormNote(s.note);
                              showToast(`Đã tải hồ sơ ${s.name} lên biểu mẫu`);
                            }}
                            className="p-1 rounded text-[#0B2419] hover:bg-[#edeee9]"
                            title="Sửa"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateTab?.('phieu-nhap-kho', 'Phiếu nhập kho')}
                            className="p-1 rounded text-[#0B2419] hover:bg-[#edeee9]"
                            title="Lập phiếu nhập kho"
                          >
                            <span className="material-symbols-outlined text-[18px]">post_add</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSuppliers(
                                suppliers.map((item) =>
                                  item.id === s.id
                                    ? { ...item, status: item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
                                    : item
                                )
                              );
                              showToast(`Đã chuyển trạng thái cho ${s.name}`);
                            }}
                            className="p-1 rounded text-[#687069] hover:text-[#ba1a1a]"
                            title="Đổi trạng thái"
                          >
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#E8E9E3] bg-[#FAF9F5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="text-[#687069]">
                Hiển thị <strong>1 – {filteredSuppliers.length}</strong> trên tổng số <strong>16</strong> nhà cung cấp
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[#0B2419] uppercase">Trang 1 / 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
