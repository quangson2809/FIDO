import React, { useState } from 'react';
import { mockAccessControl, RoleDetailDto } from '../../mocks/apiData';

export const AdminRolesView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [roles, setRoles] = useState<RoleDetailDto[]>(mockAccessControl.roles);

  const togglePermission = (roleId: number, permissionId: number) => {
    const role = roles.find((item) => item.role_id === roleId);
    if (!role) return;
    if (role.code === 'SUPERADMIN') {
      showToast('SUPERADMIN được giữ toàn quyền trong fixture test hiện tại.');
      return;
    }

    setRoles((prev) => prev.map((item) => {
      if (item.role_id !== roleId) return item;
      const hasPermission = item.permissions.some((permission) => permission.permission_id === permissionId);
      const permissions = hasPermission
        ? item.permissions.filter((permission) => permission.permission_id !== permissionId)
        : [...item.permissions, mockAccessControl.permissions.find((permission)=>permission.permission_id===permissionId)!];
      return { ...item, permissions };
    }));
    showToast(`Mock PATCH /api/v1/admin/roles/${roleId}: permission_ids full replacement`);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">AccessControlDto / RoleDetailDto / PermissionDto</div>
        <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Vai trò & quyền</h1>
        <p className="text-sm text-[#687069]">Ma trận dưới đây dùng đúng cấu trúc role ↔ permission. Các code permission là fixture test, không coi là danh sách nghiệp vụ đã khóa.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {roles.map((role)=>(
          <div key={role.role_id} className="bg-white border rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-wider text-[#687069]">role_id #{role.role_id}</div>
            <div className="text-lg font-bold text-[#0B2419] mt-1">{role.code}</div>
            <div className="text-xs text-[#424844]">{role.name}</div>
            <p className="text-[11px] text-[#687069] mt-2">{role.description ?? '—'}</p>
            <div className="mt-3 text-xs font-bold">{role.permissions.length} quyền</div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">Permission</th>{roles.map((role)=><th key={role.role_id} className="px-3">{role.code}</th>)}</tr></thead>
            <tbody className="divide-y">{mockAccessControl.permissions.map((permission)=>(
              <tr key={permission.permission_id}>
                <td className="p-3"><div className="font-bold">{permission.code}</div><div className="text-[#687069]">#{permission.permission_id} · {permission.name}</div></td>
                {roles.map((role)=>{
                  const checked = role.permissions.some((item)=>item.permission_id===permission.permission_id);
                  return <td key={role.role_id} className="text-center"><button onClick={()=>togglePermission(role.role_id,permission.permission_id)} className={`w-7 h-7 rounded border font-bold ${checked?'bg-[#0B2419] text-[#E8C75B]':'bg-white text-[#A0A69F]'}`}>{checked?'✓':'—'}</button></td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
