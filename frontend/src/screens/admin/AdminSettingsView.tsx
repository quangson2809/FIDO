import { ListSearch } from '../../shared/admin/ListSearch';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useEffect, useState } from 'react';
import { contentService } from '../../features/content/api/service';
import type { ContentPageDto } from '../../features/content/types';
import { getApiErrorMessage } from '../../services/http/apiError';

export const AdminSettingsView: React.FC<{ showToast: (msg: string) => void; canWrite: boolean }> = ({ showToast, canWrite }) => {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(false);
  const [pages, setPages] = useState<ContentPageDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPage = pages.find((page) => page.page_id === selectedId);
  const canDiscard = useDirtyForm(Boolean(selectedPage && (title !== selectedPage.title || content !== selectedPage.content)));
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
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải content pages.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [revision]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !canWrite || selectedId == null || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const updated = await contentService.updatePage(selectedId, { title: title.trim(), content: content.trim() });
      setPages((current) => current.map((page) => page.page_id === updated.page_id ? updated : page));
      selectPage(updated);
      showToast('Đã cập nhật nội dung.');
    } catch (requestError: unknown) {
      showToast(getApiErrorMessage(requestError, 'Không thể cập nhật nội dung.'));
    } finally {
      setSaving(false);
    }
  };

  const filteredPages = pages.filter(page => `${page.title} ${page.page_code}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')));

  return (
    <section className="space-y-6">
      <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Content pages</p><h1 className="mt-1 font-serif text-3xl">Quản lý nội dung</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Chỉnh sửa các trang chính sách và nội dung hiển thị tại cửa hàng.</p></header>
      <button type="button" aria-pressed={preview} onClick={() => setPreview((value) => !value)} className="admin-secondary">{preview ? "Ẩn xem trước" : "Xem trước nội dung"}</button>
      {preview && <article className="rounded-xl border border-[#E2E5DE] bg-white p-6"><h2 className="font-serif text-2xl">{title}</h2><p className="mt-4 whitespace-pre-wrap leading-7">{content}</p></article>}
      {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>Thử lại</button></div>}
      {!canWrite && <div className="border border-[#E8E9E3] bg-[#F8FAF4] p-3 text-sm text-[#606863]">Chế độ chỉ đọc. Cần CONTENT_WRITE để cập nhật nội dung.</div>}
      {loading ? <div className="p-8 text-center text-sm text-[#687069]">Đang tải...</div> : pages.length === 0 ? <div className="border border-[#E8E9E3] bg-white p-8 text-center text-sm text-[#687069]">Chưa có trang nội dung để chỉnh sửa.</div> : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="border border-[#E8E9E3] bg-white p-3"><p className="px-2 pb-2 text-xs font-bold uppercase text-[#687069]">Trang nội dung</p><ListSearch label="Tìm trang nội dung" value={search} onChange={setSearch} count={filteredPages.length} />{filteredPages.length === 0 && <p className="p-3 text-sm">Không có trang khớp tìm kiếm.</p>}<div className="space-y-1">{filteredPages.map((page) => <button key={page.page_id} type="button" onClick={() => { if (!saving && canDiscard()) selectPage(page); }} className={`w-full px-3 py-2 text-left text-sm ${selectedId === page.page_id ? 'bg-[#0B2419] text-white' : 'hover:bg-[#F5F6F2]'}`}><span className="block font-semibold">{page.title}</span><span className="block font-mono text-[10px] opacity-70">{page.page_code}</span></button>)}</div></aside>
          <form onSubmit={save} className="border border-[#E8E9E3] bg-white p-5"><fieldset disabled={saving} className="contents"><label className="block text-xs font-semibold">Tiêu đề<input disabled={!canWrite} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="mt-1 w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="mt-4 block text-xs font-semibold">Nội dung<textarea disabled={!canWrite} value={content} onChange={(event) => setContent(event.target.value)} rows={18} className="mt-1 w-full border border-[#D9DDD6] px-3 py-2 text-sm leading-6" /></label><div className="mt-4 flex items-center justify-between gap-4"><p className="text-xs text-[#687069]">Kiểm tra bản xem trước trước khi lưu nội dung.</p><button type="submit" disabled={!canWrite || saving || selectedId == null || !title.trim() || !content.trim()} className="bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu nội dung'}</button></div></fieldset></form>
        </div>
      )}
    </section>
  );
};
