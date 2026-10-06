import React, { useEffect, useState } from 'react';
import { contentService } from '../../features/content/api/service';
import type { ContentPageDto } from '../../features/content/types';

export const AdminSettingsView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [pages, setPages] = useState<ContentPageDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPage = (page: ContentPageDto) => {
    setSelectedId(page.page_id);
    setTitle(page.title);
    setContent(page.content);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await contentService.getAdminPages();
        if (!active) return;
        setPages(result);
        if (result.length > 0) selectPage(result[0]);
        setError(null);
      } catch {
        if (active) setError('Không thể tải content pages.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedId == null || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const updated = await contentService.updatePage(selectedId, { title: title.trim(), content: content.trim() });
      setPages((current) => current.map((page) => page.page_id === updated.page_id ? updated : page));
      selectPage(updated);
      showToast('Đã cập nhật nội dung.');
    } catch {
      showToast('Không thể cập nhật nội dung.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Content pages</p><h1 className="mt-1 font-serif text-3xl">Quản lý nội dung</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">FIDO hiện có API content page, không có generic business-settings API. Vì vậy màn hình này chỉ quản lý nội dung được backend hỗ trợ.</p></header>
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="p-8 text-center text-sm text-[#687069]">Đang tải...</div> : pages.length === 0 ? <div className="border border-[#E8E9E3] bg-white p-8 text-center text-sm text-[#687069]">Chưa có content page. Không tự tạo page code mặc định vì đó là dữ liệu nghiệp vụ.</div> : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="border border-[#E8E9E3] bg-white p-3"><p className="px-2 pb-2 text-xs font-bold uppercase text-[#687069]">Trang nội dung</p><div className="space-y-1">{pages.map((page) => <button key={page.page_id} type="button" onClick={() => selectPage(page)} className={`w-full px-3 py-2 text-left text-sm ${selectedId === page.page_id ? 'bg-[#0B2419] text-white' : 'hover:bg-[#F5F6F2]'}`}><span className="block font-semibold">{page.title}</span><span className="block font-mono text-[10px] opacity-70">{page.page_code}</span></button>)}</div></aside>
          <form onSubmit={save} className="border border-[#E8E9E3] bg-white p-5"><label className="block text-xs font-semibold">Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="mt-1 w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="mt-4 block text-xs font-semibold">Nội dung<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={18} className="mt-1 w-full border border-[#D9DDD6] px-3 py-2 text-sm leading-6" /></label><div className="mt-4 flex items-center justify-between gap-4"><p className="text-xs text-[#687069]">Page code không đổi qua PATCH hiện tại.</p><button type="submit" disabled={saving || selectedId == null || !title.trim() || !content.trim()} className="bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu nội dung'}</button></div></form>
        </div>
      )}
    </section>
  );
};
