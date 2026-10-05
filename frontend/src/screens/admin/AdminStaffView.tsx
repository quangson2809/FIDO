import React, { useEffect, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';
import type { AccessControlDto, StaffAccountDetailDto, StaffAccountSummaryDto } from '../../features/adminAccess/types';

export const AdminStaffView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [staff, setStaff] = useState<StaffAccountSummaryDto[]>([]);
  const [access, setAccess] = useState<AccessControlDto | null>(null);
  const [detail, setDetail] = useState<StaffAccountDetailDto | null>(null);
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadAccess = async () => {
      try {
        const result = await adminAccessService.getAccessControl();
        if (active) setAccess(result);
      } catch {
        if (active) setError('Không thể tải danh sách vai trò.');
      }
    };
    void loadAccess();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadStaff = async () => {
      try {
        const response = await adminAccessService.getStaff({ q: query || undefined, role_id: roleId, page: 0, page_size: 50 });
        if (!active) return;
        setStaff(response.data);
        setError(null);
      } catch {
        if (active) setError('Không thể tải tài khoản nhân viên.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadStaff();
    return () => { active = false; };
  }, [query, roleId]);

  const openDetail = async (accountId: number) => {
    try {
      setDetail(await adminAccessService.getStaffDetail(accountId));
    } catch {
      showToast('Không thể tải chi tiết nhân viên.');
    }
  };

  return (
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Internal accounts</p><h1 className="mt-1 font-serif text-3xl">Nhân viên</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Hiển thị account và role thật của backend. Không suy diễn chức danh, ca làm việc, showroom, kỹ năng may hoặc trạng thái nhân sự.</p></header>
      <form onSubmit={(event) => { event.preventDefault(); setLoading(true); setQuery(queryDraft.trim()); }} className="flex flex-wrap gap-3">
        <input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Số điện thoại hoặc email" className="min-w-64 flex-1 border border-[#D9DDD6] bg-white px-3 py-2 text-sm" />
        <select value={roleId ?? ''} onChange={(event) => { setLoading(true); setRoleId(event.target.value ? Number(event.target.value) : undefined); }} className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"><option value="">Tất cả vai trò</option>{access?.roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.code}</option>)}</select>
        <button type="submit" className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Tìm</button>
      </form>
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto border border-[#E8E9E3] bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#687069]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#E8E9E3]">{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center">Đang tải...</td></tr> : staff.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#687069]">Không có tài khoản phù hợp.</td></tr> : staff.map((member) => <tr key={member.account.account_id}><td className="px-4 py-3 font-mono">#{member.account.account_id}</td><td className="px-4 py-3 font-semibold">{member.account.phone}</td><td className="px-4 py-3">{member.account.email ?? '—'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{member.roles.map((role) => <span key={role.role_id} className="bg-[#0B2419]/10 px-2 py-1 text-xs font-bold">{role.code}</span>)}</div></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void openDetail(member.account.account_id)} className="border border-[#0B2419] px-3 py-1.5 text-xs font-semibold">Quyền</button></td></tr>)}</tbody></table></div>
      {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setDetail(null)}><div className="w-full max-w-2xl bg-white p-6" onMouseDown={(event) => event.stopPropagation()}><div className="flex justify-between"><div><p className="text-xs uppercase text-[#687069]">Account #{detail.account.account_id}</p><h2 className="font-serif text-2xl">{detail.account.phone}</h2></div><button type="button" onClick={() => setDetail(null)} className="text-2xl">×</button></div><h3 className="mt-5 font-bold">Vai trò</h3><div className="mt-2 flex flex-wrap gap-2">{detail.roles.map((role) => <span key={role.role_id} className="border border-[#D9DDD6] px-2 py-1 text-xs">{role.code}</span>)}</div><h3 className="mt-5 font-bold">Quyền hiệu lực</h3><div className="mt-2 flex flex-wrap gap-2">{detail.permissions.map((permission) => <span key={permission.permission_id} className="bg-[#F5F6F2] px-2 py-1 text-xs">{permission.code}</span>)}</div></div></div>}
    </section>
  );
};
