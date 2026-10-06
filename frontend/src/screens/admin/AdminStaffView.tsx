import React, { useEffect, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';
import type { AccessControlDto, StaffAccountDetailDto, StaffAccountSummaryDto } from '../../features/adminAccess/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface StaffDraft {
  phone: string;
  email: string;
  password: string;
  roleIds: number[];
}

const emptyDraft: StaffDraft = { phone: '', email: '', password: '', roleIds: [] };

export const AdminStaffView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [staff, setStaff] = useState<StaffAccountSummaryDto[]>([]);
  const [access, setAccess] = useState<AccessControlDto | null>(null);
  const [detail, setDetail] = useState<StaffAccountDetailDto | null>(null);
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [roleId, setRoleId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<StaffDraft>(emptyDraft);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleIds, setEditRoleIds] = useState<number[]>([]);

  const loadAccess = async () => {
    const result = await adminAccessService.getAccessControl();
    setAccess(result);
    return result;
  };

  const loadStaff = async () => {
    const response = await adminAccessService.getStaff({
      q: query || undefined,
      role_id: roleId,
      page: 0,
      page_size: 50,
    });
    setStaff(response.data);
    setError(null);
  };

  useEffect(() => {
    let active = true;
    void adminAccessService.getAccessControl()
      .then((result) => { if (active) setAccess(result); })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải danh sách vai trò.'));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void adminAccessService.getStaff({ q: query || undefined, role_id: roleId, page: 0, page_size: 50 })
      .then((response) => {
        if (!active) return;
        setStaff(response.data);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải tài khoản nhân viên.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, roleId]);

  const toggleRole = (roleIds: number[], nextRoleId: number): number[] =>
    roleIds.includes(nextRoleId)
      ? roleIds.filter((id) => id !== nextRoleId)
      : [...roleIds, nextRoleId];

  const openDetail = async (accountId: number) => {
    try {
      const result = await adminAccessService.getStaffDetail(accountId);
      setDetail(result);
      setEditPhone(result.account.phone);
      setEditEmail(result.account.email ?? '');
      setEditRoleIds(result.roles.map((role) => role.role_id));
    } catch (requestError: unknown) {
      showToast(getApiErrorMessage(requestError, 'Không thể tải chi tiết nhân viên.'));
    }
  };

  const createStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !createDraft.phone.trim() || !createDraft.password) return;
    setBusy(true);
    try {
      const created = await adminAccessService.createStaff({
        phone: createDraft.phone.trim(),
        email: createDraft.email.trim() || null,
        password: createDraft.password,
        role_ids: createDraft.roleIds,
      });
      setCreateDraft(emptyDraft);
      setShowCreate(false);
      await Promise.all([loadStaff(), loadAccess()]);
      await openDetail(created.account.account_id);
      showToast('Đã tạo tài khoản nhân viên.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo tài khoản nhân viên.'));
    } finally {
      setBusy(false);
    }
  };

  const updateStaff = async () => {
    if (!detail || busy || !editPhone.trim()) return;
    setBusy(true);
    try {
      const updated = await adminAccessService.updateStaff(detail.account.account_id, {
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role_ids: editRoleIds,
      });
      setDetail(updated);
      setEditPhone(updated.account.phone);
      setEditEmail(updated.account.email ?? '');
      setEditRoleIds(updated.roles.map((role) => role.role_id));
      await loadStaff();
      showToast('Đã cập nhật tài khoản nhân viên.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật tài khoản nhân viên.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Internal accounts</p><h1 className="mt-1 font-serif text-3xl">Nhân viên</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Account và role lấy trực tiếp từ backend; tạo/cập nhật cũng đi qua API staff-accounts.</p></div><button type="button" onClick={() => setShowCreate((value) => !value)} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">{showCreate ? 'Đóng' : 'Thêm nhân viên'}</button></header>

      {showCreate && <form onSubmit={createStaff} className="space-y-4 border border-[#E8E9E3] bg-white p-5"><div className="grid gap-3 md:grid-cols-3"><input value={createDraft.phone} onChange={(event) => setCreateDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Số điện thoại *" maxLength={20} className="border border-[#D9DDD6] px-3 py-2 text-sm" /><input value={createDraft.email} onChange={(event) => setCreateDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email" type="email" maxLength={254} className="border border-[#D9DDD6] px-3 py-2 text-sm" /><input value={createDraft.password} onChange={(event) => setCreateDraft((current) => ({ ...current, password: event.target.value }))} placeholder="Mật khẩu *" type="password" className="border border-[#D9DDD6] px-3 py-2 text-sm" /></div><div className="flex flex-wrap gap-2">{access?.roles.map((role) => <label key={role.role_id} className="flex items-center gap-2 border border-[#D9DDD6] px-2 py-1 text-xs"><input type="checkbox" checked={createDraft.roleIds.includes(role.role_id)} onChange={() => setCreateDraft((current) => ({ ...current, roleIds: toggleRole(current.roleIds, role.role_id) }))} />{role.code}</label>)}</div><button disabled={busy} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Tạo tài khoản</button></form>}

      <form onSubmit={(event) => { event.preventDefault(); setQuery(queryDraft.trim()); }} className="flex flex-wrap gap-3">
        <input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Số điện thoại hoặc email" className="min-w-64 flex-1 border border-[#D9DDD6] bg-white px-3 py-2 text-sm" />
        <select value={roleId ?? ''} onChange={(event) => setRoleId(event.target.value ? Number(event.target.value) : undefined)} className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"><option value="">Tất cả vai trò</option>{access?.roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.code}</option>)}</select>
        <button type="submit" className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Tìm</button>
      </form>
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto border border-[#E8E9E3] bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#687069]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-[#E8E9E3]">{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center">Đang tải...</td></tr> : staff.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#687069]">Không có tài khoản phù hợp.</td></tr> : staff.map((member) => <tr key={member.account.account_id}><td className="px-4 py-3 font-mono">#{member.account.account_id}</td><td className="px-4 py-3 font-semibold">{member.account.phone}</td><td className="px-4 py-3">{member.account.email ?? '—'}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1">{member.roles.map((role) => <span key={role.role_id} className="bg-[#0B2419]/10 px-2 py-1 text-xs font-bold">{role.code}</span>)}</div></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void openDetail(member.account.account_id)} className="border border-[#0B2419] px-3 py-1.5 text-xs font-semibold">Chi tiết</button></td></tr>)}</tbody></table></div>

      {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setDetail(null)}><div className="w-full max-w-2xl bg-white p-6" onMouseDown={(event) => event.stopPropagation()}><div className="flex justify-between"><div><p className="text-xs uppercase text-[#687069]">Account #{detail.account.account_id}</p><h2 className="font-serif text-2xl">Tài khoản nhân viên</h2></div><button type="button" onClick={() => setDetail(null)} className="text-2xl">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-semibold">Số điện thoại</span><input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} maxLength={20} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold">Email</span><input value={editEmail} onChange={(event) => setEditEmail(event.target.value)} type="email" maxLength={254} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label></div><h3 className="mt-5 font-bold">Vai trò</h3><div className="mt-2 flex flex-wrap gap-2">{access?.roles.map((role) => <label key={role.role_id} className="flex items-center gap-2 border border-[#D9DDD6] px-2 py-1 text-xs"><input type="checkbox" checked={editRoleIds.includes(role.role_id)} onChange={() => setEditRoleIds((current) => toggleRole(current, role.role_id))} />{role.code}</label>)}</div><h3 className="mt-5 font-bold">Quyền hiệu lực</h3><div className="mt-2 flex flex-wrap gap-2">{detail.permissions.map((permission) => <span key={permission.permission_id} className="bg-[#F5F6F2] px-2 py-1 text-xs">{permission.code}</span>)}</div><button type="button" disabled={busy} onClick={() => void updateStaff()} className="mt-5 bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Lưu thay đổi</button></div></div>}
    </section>
  );
};
