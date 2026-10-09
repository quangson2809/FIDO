import { formatVietnamDateTime } from '../../shared/time/formatVietnamDateTime';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { Pagination } from '../../shared/admin/Pagination';
import React, { useCallback, useState } from 'react';
import { adminAccessService } from '../../features/adminAccess/api/service';


export const AdminAuditView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [actionDraft, setActionDraft] = useState('');
  const [targetTypeDraft, setTargetTypeDraft] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [page, setPage] = useState(1);
  const query = useRemoteQuery(useCallback(() => adminAccessService.getAuditLogs({ action: action || undefined, target_type: targetType || undefined, page, page_size: 20 }), [action, targetType, page]));
  const logs = query.data?.data ?? [];
  const loading = query.loading;

  return (
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Audit trail</p><h1 className="mt-1 font-serif text-3xl">Nhật ký hệ thống</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Dữ liệu đọc trực tiếp từ audit API; không tạo giả IP, thiết bị, severity hoặc vị trí vì backend không trả các trường đó.</p></header>
      <form onSubmit={(event) => { event.preventDefault(); setPage(1); query.reload(); setAction(actionDraft.trim()); setTargetType(targetTypeDraft.trim()); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} placeholder="Action, ví dụ ORDER_CONFIRMED" className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm" /><input value={targetTypeDraft} onChange={(event) => setTargetTypeDraft(event.target.value)} placeholder="Target type" className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm" /><button type="submit" className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Lọc</button></form>
      <QueryFeedback error={query.error} onRetry={query.reload} />
      <div className="overflow-x-auto border border-[#E8E9E3] bg-white"><table className="w-full text-left text-sm"><thead className="bg-[#F5F6F2] text-xs uppercase text-[#687069]"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Mô tả</th></tr></thead><tbody className="divide-y divide-[#E8E9E3]">{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center">Đang tải...</td></tr> : query.error ? null : logs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#687069]">Không có audit log phù hợp.</td></tr> : logs.map((log) => <tr key={log.audit_id}><td className="whitespace-nowrap px-4 py-3">{formatVietnamDateTime(log.created_at)}</td><td className="px-4 py-3 font-mono">{log.actor_account_id == null ? 'SYSTEM' : `#${log.actor_account_id}`}</td><td className="px-4 py-3 font-mono text-xs font-bold">{log.action}</td><td className="px-4 py-3"><span className="font-semibold">{log.target_type}</span><span className="ml-1 font-mono text-xs text-[#687069]">{log.target_id}</span></td><td className="max-w-xl px-4 py-3 text-[#606863]">{log.description ?? '—'}</td></tr>)}</tbody></table></div>
      <Pagination meta={query.data?.meta} loading={loading} onPage={setPage} />
      <button type="button" onClick={() => showToast('Audit log là read-only ở frontend.')} className="text-xs text-[#687069] underline">Audit boundary</button>
    </section>
  );
};
