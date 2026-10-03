import React, { useState } from 'react';

interface StaffMember {
  id: string;
  name: string;
  role: 'MASTER_TAILOR' | 'SHOWROOM_MANAGER' | 'FASHION_STYLIST' | 'LOGISTICS_LEAD' | 'ADMIN';
  department: string;
  location: string;
  email: string;
  phone: string;
  shift: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'BUSY';
  tailoringSkills?: string[];
}

export const AdminStaffView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [staff] = useState<StaffMember[]>([
    {
      id: 'STF-01',
      name: 'Nguyễn Văn Nam',
      role: 'MASTER_TAILOR',
      department: 'Xưởng May Atelier Vert',
      location: 'Xưởng Sản Xuất Trung Tâm',
      email: 'nam.nguyen@fidofashion.com',
      phone: '0918 223 344',
      shift: 'Ca sáng (08:00 - 16:30)',
      status: 'BUSY',
      tailoringSkills: ['Quần Selvedge Denim chỉ vàng', 'Gấu lật quần Gurkha', 'Cắt gấu giấu chỉ'],
    },
    {
      id: 'STF-02',
      name: 'Phan Bảo Trâm',
      role: 'SHOWROOM_MANAGER',
      department: 'Quản Lý Bán Lẻ',
      location: 'Showroom Lý Tự Trọng (Q.1, TP.HCM)',
      email: 'tram.phan@fidofashion.com',
      phone: '0909 888 777',
      shift: 'Toàn thời gian (09:00 - 18:00)',
      status: 'ACTIVE',
    },
    {
      id: 'STF-03',
      name: 'Vũ Đức Minh',
      role: 'FASHION_STYLIST',
      department: 'Tư Vấn Phong Cách & Fitting',
      location: 'Showroom Tràng Tiền (Hà Nội)',
      email: 'minh.vu@fidofashion.com',
      phone: '0987 654 321',
      shift: 'Ca chiều (13:30 - 21:30)',
      status: 'ACTIVE',
      tailoringSkills: ['Lấy số đo hình thể chuẩn', 'Tư vấn phom dáng Quiet Luxury'],
    },
    {
      id: 'STF-04',
      name: 'Hoàng Quốc Tuấn',
      role: 'LOGISTICS_LEAD',
      department: 'Vận Hành & Điều Phối COD',
      location: 'Kho Tổng Hà Nội',
      email: 'tuan.hoang@fidofashion.com',
      phone: '0933 445 566',
      shift: 'Ca sáng (07:30 - 16:00)',
      status: 'ACTIVE',
    },
    {
      id: 'STF-05',
      name: 'Đặng Quang Sơn',
      role: 'ADMIN',
      department: 'Ban Giám Đốc & Vận Hành',
      location: 'Trụ sở FIDO Headquarter',
      email: 'dangquangsontk2005@gmail.com',
      phone: '0912 333 444',
      shift: 'Linh hoạt',
      status: 'ACTIVE',
    },
  ]);

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: StaffMember['role']) => {
    switch (role) {
      case 'MASTER_TAILOR':
        return (
          <span className="inline-flex items-center gap-1 bg-[#E5C358]/20 text-[#725C00] font-bold px-2 py-0.5 rounded text-[10px]">
            <span className="material-symbols-outlined text-[12px]">content_cut</span>
            THỢ MAY TRƯỞNG
          </span>
        );
      case 'SHOWROOM_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 bg-[#0B2419]/10 text-[#0B2419] font-bold px-2 py-0.5 rounded text-[10px]">
            <span className="material-symbols-outlined text-[12px]">store</span>
            QUẢN LÝ SHOWROOM
          </span>
        );
      case 'FASHION_STYLIST':
        return (
          <span className="inline-flex items-center gap-1 bg-[#1B5038]/10 text-[#1B5038] font-bold px-2 py-0.5 rounded text-[10px]">
            <span className="material-symbols-outlined text-[12px]">styler</span>
            STYLIST / TƯ VẤN
          </span>
        );
      case 'LOGISTICS_LEAD':
        return (
          <span className="inline-flex items-center gap-1 bg-[#687069]/15 text-[#424844] font-bold px-2 py-0.5 rounded text-[10px]">
            <span className="material-symbols-outlined text-[12px]">local_shipping</span>
            ĐIỀU PHỐI COD
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 bg-[#0B2419] text-[#E5C358] font-bold px-2 py-0.5 rounded text-[10px]">
            <span className="material-symbols-outlined text-[12px]">shield</span>
            QUẢN TRỊ VIÊN
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>Đội ngũ thợ may &amp; nhân sự bán lẻ Atelier Vert</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
            Tài Khoản Nhân Viên &amp; Đội Ngũ Thợ May
          </h1>
          <p className="text-sm text-[#424844] max-w-3xl">
            Quản trị nhân sự hệ thống, phân quyền bàn cắt xưởng may, quản lý ca trực stylist và chuyên viên điều phối giao vận COD đồng kiểm.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Mở form tạo tài khoản nhân viên mới')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] text-white hover:bg-[#1B5038] transition-colors text-xs font-semibold uppercase tracking-wider rounded shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Thêm Nhân Viên Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#687069]">Tổng Nhân Sự</span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            32 <span className="text-xs font-sans font-normal text-[#687069]">thành viên</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">Toàn thời gian &amp; Xưởng may</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#725C00]">Thợ May Xưởng</span>
          <div className="mt-2 text-3xl font-bold text-[#725C00] font-['Playfair_Display',serif]">
            8 <span className="text-xs font-sans font-normal text-[#687069]">nghệ nhân</span>
          </div>
          <div className="mt-2 text-xs text-[#687069]">Phụ trách cắt may &amp; lên gấu</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B5038]">Đang Trực Ca</span>
          <div className="mt-2 text-3xl font-bold text-[#1B5038] font-['Playfair_Display',serif]">
            28 <span className="text-xs font-sans font-normal text-[#687069]">nhân sự</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">Sẵn sàng phục vụ khách</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#687069]">Showroom Hoạt Động</span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            2 <span className="text-xs font-sans font-normal text-[#687069]">địa điểm</span>
          </div>
          <div className="mt-2 text-xs text-[#687069]">Hà Nội &amp; TP. Hồ Chí Minh</div>
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
                placeholder="Tìm tên, chức danh, email nhân sự..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-[#FAF9F5] border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
            >
              <option value="all">Tất cả chức danh</option>
              <option value="MASTER_TAILOR">Thợ may xưởng</option>
              <option value="SHOWROOM_MANAGER">Quản lý Showroom</option>
              <option value="FASHION_STYLIST">Stylist / Tư vấn</option>
              <option value="LOGISTICS_LEAD">Điều phối COD</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </div>

          <div className="text-xs text-[#687069]">
            Hiển thị <strong>{filteredStaff.length}</strong> nhân sự
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#424844]">
            <thead className="bg-[#FAF9F5] text-[#687069] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8E9E3]">
              <tr>
                <th className="py-3 px-4">Nhân Sự</th>
                <th className="py-3 px-4">Chức Danh &amp; Vai Trò</th>
                <th className="py-3 px-4">Đơn Vị &amp; Cơ Sở</th>
                <th className="py-3 px-4">Ca Làm Việc</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2ED]">
              {filteredStaff.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B2419] text-[#E5C358] flex items-center justify-center font-bold text-xs">
                        {s.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(-2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-bold text-[#0B2419]">{s.name}</div>
                        <div className="text-[11px] text-[#687069]">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getRoleBadge(s.role)}
                    {s.tailoringSkills && (
                      <div className="text-[10px] text-[#725C00] mt-1">
                        Chuyên: {s.tailoringSkills.join(' &bull; ')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#0B2419]">{s.department}</div>
                    <div className="text-[11px] text-[#687069]">{s.location}</div>
                  </td>
                  <td className="py-3 px-4 text-[#687069]">{s.shift}</td>
                  <td className="py-3 px-4">
                    {s.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1B5038]">
                        <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
                        Đang làm việc
                      </span>
                    )}
                    {s.status === 'BUSY' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#725C00]">
                        <span className="w-2 h-2 rounded-full bg-[#E5C358]"></span>
                        Đang may đo
                      </span>
                    )}
                    {s.status === 'ON_LEAVE' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#687069]">
                        <span className="w-2 h-2 rounded-full bg-[#687069]"></span>
                        Nghỉ phép
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() =>
                        showToast(`Mở phân quyền và thông tin chi tiết cho nhân sự ${s.name}`)
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-[#0B2419] hover:bg-[#0B2419]/5 rounded border border-[#E8E9E3]"
                    >
                      Chi tiết
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