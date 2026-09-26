import React, { useMemo, useState } from 'react';
import { mockAuditLogs } from '../../mocks/apiData';

export const AdminAuditView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(()=>mockAuditLogs.filter((log)=>
    [log.action,log.target_type,log.target_id,log.description ?? '',String(log.actor_account_id)]
      .some((value)=>value.toLowerCase().includes(query.toLowerCase())),
  ),[query]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-4">
        <div><div className="text-[11px] font-bold text-[#1B5038] uppercase tracking-widest">AuditLogDto</div><h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">Nhật ký thao tác</h1><p className="text-sm text-[#687069]">Chỉ actor/action/target/description/created_at; không mock IP, device hay severity khi contract không có.</p></div>
        <button onClick={()=>showToast('Mock export audit logs')} className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded self-start">Xuất mock</button>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Tìm actor/action/target..." className="px-3 py-2 border rounded text-xs min-w-[280px]"/></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">audit_id</th><th>actor</th><th>action</th><th>target</th><th className="text-left">description</th><th>created_at</th></tr></thead><tbody className="divide-y">{filtered.map((log)=>(
          <tr key={log.audit_id}><td className="p-3 font-bold">#{log.audit_id}</td><td className="text-center">#{log.actor_account_id}</td><td className="text-center font-mono">{log.action}</td><td className="text-center">{log.target_type} #{log.target_id}</td><td className="p-3">{log.description ?? '—'}</td><td className="text-center whitespace-nowrap">{log.created_at}</td></tr>
        ))}</tbody></table></div>
      </div>
    </div>
  );
};
