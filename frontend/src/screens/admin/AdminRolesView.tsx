import React, { useEffect, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';
import type { AccessControlDto } from '../../features/adminAccess/types';

export const AdminRolesView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [access, setAccess] = useState<AccessControlDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await adminAccessService.getAccessControl();
        if (active) setAccess(result);
      } catch {
        if (active) setError('Không thể tải ma trận phân quyền.');
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (error) return <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!access) return <div className="p-8 text-center text-sm text-[#687069]">Đang tải phân quyền...</div>;

  return (
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">RBAC</p><h1 className="mt-1 font-serif text-3xl">Vai trò & quyền</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Ma trận này phản ánh trực tiếp `/admin/access-control`. Frontend chỉ trình bày quyền; backend vẫn là security boundary.</p></header>
      <div className="grid gap-4 lg:grid-cols-2">{access.roles.map((role) => <article key={role.role_id} className="border border-[#E8E9E3] bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs text-[#687069]">#{role.role_id}</p><h2 className="font-serif text-xl">{role.code}</h2><p className="mt-1 text-sm text-[#606863]">{role.name}</p>{role.description && <p className="mt-2 text-xs leading-5 text-[#687069]">{role.description}</p>}</div><span className="rounded bg-[#0B2419] px-2 py-1 text-xs font-bold text-white">{role.permissions.length} quyền</span></div><div className="mt-4 flex flex-wrap gap-2">{role.permissions.map((permission) => <span key={permission.permission_id} title={permission.name} className="border border-[#D9DDD6] bg-[#F8FAF4] px-2 py-1 text-xs">{permission.code}</span>)}</div></article>)}</div>
      <div className="border border-[#E8E9E3] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-serif text-xl">Permission catalog</h2><button type="button" onClick={() => showToast('CRUD role/permission sẽ dùng đúng command API; màn hình hiện tại chỉ đọc để loại bỏ dữ liệu giả trước.')} className="text-xs font-semibold underline">Phạm vi phase</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{access.permissions.map((permission) => <div key={permission.permission_id} className="border border-[#E8E9E3] p-3"><p className="font-mono text-xs font-bold">{permission.code}</p><p className="mt-1 text-xs text-[#687069]">{permission.name}</p></div>)}</div></div>
    </section>
  );
};
