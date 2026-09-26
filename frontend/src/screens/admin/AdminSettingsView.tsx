import React, { useState } from 'react';
import { ContentPageDto, mockContentPages } from '../../mocks/apiData';

export const AdminSettingsView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [pages, setPages] = useState<ContentPageDto[]>(mockContentPages);
  const [selectedId, setSelectedId] = useState(pages[0]?.page_id ?? 0);
  const selected = pages.find((page)=>page.page_id===selectedId);

  const updateSelected = (patch: Partial<ContentPageDto>) => {
    setPages((prev)=>prev.map((page)=>page.page_id===selectedId?{...page,...patch}:page));
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    showToast(`Mock PATCH /api/v1/admin/content-pages/${selectedId}: title/content`);
    updateSelected({ updated_at: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">ContentPageDto</div>
        <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Nội dung & chính sách</h1>
        <p className="text-sm text-[#687069]">Không mock cài đặt server/SMS/ngưỡng vận chuyển vì baseline chỉ khóa content page ở module này.</p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        <aside className="bg-white border rounded-lg p-3 space-y-2 h-fit">
          {pages.map((page)=>(
            <button key={page.page_id} onClick={()=>setSelectedId(page.page_id)} className={`w-full text-left p-3 rounded text-xs ${selectedId===page.page_id?'bg-[#0B2419] text-white':'hover:bg-[#F5F6F2]'}`}>
              <div className="font-bold">{page.title}</div><div className="opacity-70 font-mono mt-1">{page.page_code}</div>
            </button>
          ))}
        </aside>

        {selected && <form onSubmit={save} className="bg-white border rounded-lg p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div><label className="font-bold">page_id</label><input disabled value={selected.page_id} className="w-full mt-1 px-3 py-2 border bg-[#F5F6F2]"/></div>
            <div><label className="font-bold">page_code (stable)</label><input disabled value={selected.page_code} className="w-full mt-1 px-3 py-2 border bg-[#F5F6F2]"/></div>
          </div>
          <div><label className="text-xs font-bold">title</label><input value={selected.title} onChange={(e)=>updateSelected({title:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded"/></div>
          <div><label className="text-xs font-bold">content</label><textarea rows={10} value={selected.content} onChange={(e)=>updateSelected({content:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded"/></div>
          <div className="text-[11px] text-[#687069]">updated_by_account_id: #{selected.updated_by_account_id} · updated_at: {selected.updated_at}</div>
          <button className="px-5 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded">Lưu mock</button>
        </form>}
      </div>
    </div>
  );
};
