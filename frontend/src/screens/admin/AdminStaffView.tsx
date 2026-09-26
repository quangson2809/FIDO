import React, { useMemo, useState } from 'react';
import { mockStaffAccounts } from '../../mocks/apiData';

export const AdminStaffView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const roleCodes = [...new Set(mockStaffAccounts.flatMap((staff) => staff.roles.map((role) => role.code)))];
  const filtered = useMemo(
    () =>
      mockStaffAccounts.filter((staff) => {
        const account = staff.account;
        const matchesQuery = [String(account.account_id), account.phone ?? '', account.email ?? '']
          .some((value) => value.toLowerCase().includes(query.toLowerCase()));
        const matchesRole = roleFilter === 'ALL' || staff.roles.some((role) => role.code === roleFilter);
        return matchesQuery && matchesRole;
      }),
    [query, roleFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">StaffAccountSummaryDto / DetailDto</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Tài khoản nội bộ</h1>
          <p className="text-sm text-[#687069] mt-1">Mock chỉ dùng account, roles và permissions; không thêm tên nhân viên, phòng ban, ca làm hoặc trạng thái tài khoản.</p>
        </div>
        <button onClick={() => showToast('Mock POST /api/v1/admin/staff-accounts')} className="px-4 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded">
          + Tạo tài khoản mock
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Tài khoản nội bộ</div><div className="text-3xl font-bold">{mockStaffAccounts.length}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Role đang dùng</div><div className="text-3xl font-bold">{roleCodes.length}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Permission hiệu lực</div><div className="text-3xl font-bold">{new Set(mockStaffAccounts.flatMap((s)=>s.permissions.map((p)=>p.permission_id))).size}</div></div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Tìm account_id / SĐT / email..." className="px-3 py-2 border rounded text-xs flex-1"/>
          <select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value)} className="px-3 py-2 border rounded text-xs">
            <option value="ALL">Tất cả role</option>
            {roleCodes.map((code)=><option key={code} value={code}>{code}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">Account</th><th>SĐT</th><th>Email</th><th>Roles</th><th>Permissions</th><th>Cập nhật</th></tr></thead>
            <tbody className="divide-y">{filtered.map((staff)=>(
              <tr key={staff.account.account_id}>
                <td className="p-3 font-bold">#{staff.account.account_id}</td>
                <td className="text-center font-mono">{staff.account.phone ?? '—'}</td>
                <td className="text-center">{staff.account.email ?? '—'}</td>
                <td className="text-center">{staff.roles.map((role)=><span key={role.role_id} className="inline-block m-0.5 px-2 py-1 rounded bg-[#0B2419] text-[#E8C75B] font-bold">{role.code}</span>)}</td>
                <td className="text-center">{staff.permissions.length}</td>
                <td className="text-center whitespace-nowrap">{staff.account.updated_at}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#687069]">Password không bao giờ nằm trong response mock, đúng contract StaffAccountDetailDto.</p>
    </div>
  );
};
