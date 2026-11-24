import { Modal } from '../../shared/admin/Modal';
import { ListSearch } from '../../shared/admin/ListSearch';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useEffect, useState } from 'react';
import { contentService } from '../../features/content/api/service';
import type { ContentPageDto, ContentPageSummaryDto } from '../../features/content/types';
import { getApiErrorMessage } from '../../services/http/apiError';

export const AdminSettingsView: React.FC<{
  showToast: (msg: string) => void;
  canWrite: boolean;
}> = ({ showToast, canWrite }) => {
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ page_code: '', title: '', content: '' });
  const [pages, setPages] = useState<ContentPageSummaryDto[]>([]);
  const [detail, setDetail] = useState<ContentPageDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPage = detail;
  const canDiscard = useDirtyForm(
    Boolean(selectedPage && (title !== selectedPage.title || content !== selectedPage.content)) || Boolean(creating && (draft.page_code || draft.title || draft.content)),
  );
  const selectPage = (page: ContentPageSummaryDto) => {
    if (page.page_id === selectedId) return;
    setDetail(null);
    setSelectedId(page.page_id);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await contentService.getAdminPages();
        if (!active) return;
        setPages(result);
        if (result.length > 0) setSelectedId((current) => current ?? result[0].page_id);
        setError(null);
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải content pages.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [revision]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) { setDetailLoading(true); setDetail(null); }
      return contentService.getAdminPage(selectedId);
    }).then((page) => {
      if (!active) return;
      setDetail(page);
      setTitle(page.title);
      setContent(page.content);
      setError(null);
    }).catch((requestError: unknown) => {
      if (active) setError(getApiErrorMessage(requestError, 'Không thể tải nội dung trang.'));
    }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, revision]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || detailLoading || !detail || !canWrite || selectedId == null || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const updated = await contentService.updatePage(selectedId, {
        title: title.trim(),
        content: content.trim(),
      });
      setPages((current) =>
        current.map((page) => (page.page_id === updated.page_id ? updated : page)),
      );
      setDetail(updated);
      setTitle(updated.title);
      setContent(updated.content);
      showToast('Đã cập nhật nội dung.');
    } catch (requestError: unknown) {
      showToast(getApiErrorMessage(requestError, 'Không thể cập nhật nội dung.'));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: ContentPageSummaryDto['status']) => {
    if (!detail || saving || !canWrite || !canDiscard()) return;
    const selected = detail.page_id;
    setSaving(true); setError(null);
    try {
      const updated = await contentService.updatePage(selected, { status });
      setDetail(updated); setTitle(updated.title); setContent(updated.content);
      setPages(current => current.map(page => page.page_id === selected ? updated : page));
      showToast(status === 'PUBLISHED' ? 'Đã công bố nội dung.' : status === 'ARCHIVED' ? 'Đã lưu trữ nội dung.' : 'Đã gỡ công bố, chuyển về bản nháp.');
    } catch (cause: unknown) { setError(getApiErrorMessage(cause, 'Không thể đổi trạng thái nội dung.')); }
    finally { setSaving(false); }
  };

  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving || !canWrite) return; setSaving(true); setError(null);
    try { const created = await contentService.createPage(draft); setPages(current => [...current, created]); setSelectedId(created.page_id); setCreating(false); setDraft({ page_code: '', title: '', content: '' }); showToast('Đã tạo bản nháp.'); }
    catch (cause: unknown) { setError(getApiErrorMessage(cause, 'Không thể tạo bản nháp.')); }
    finally { setSaving(false); }
  };

  const filteredPages = pages.filter((page) =>
    `${page.title} ${page.page_code}`
      .toLocaleLowerCase('vi-VN')
      .includes(search.trim().toLocaleLowerCase('vi-VN')),
  );

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Content pages</p>
        <h1 className="mt-1 font-serif text-3xl">Quản lý nội dung</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#606863]">
          Chỉnh sửa các trang chính sách và nội dung hiển thị tại cửa hàng.
        </p>
      </header>
      {canWrite && <button type="button" className="admin-primary" disabled={saving} onClick={() => { if (canDiscard()) setCreating(true); }}>Tạo bản nháp nội dung</button>}
      {creating && <Modal title="Soạn bản nháp nội dung" busy={saving} onClose={() => { if (!saving && canDiscard()) setCreating(false); }}>
        <form onSubmit={createDraft} className="space-y-3"><fieldset disabled={saving} className="space-y-3">
          <label>Mã đường dẫn<input className="field-input" required maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.page_code} onChange={e => setDraft(current => ({ ...current, page_code: e.target.value }))} /></label>
          <label>Tiêu đề bản nháp<input className="field-input" required maxLength={255} value={draft.title} onChange={e => setDraft(current => ({ ...current, title: e.target.value }))} /></label>
          <label>Nội dung bản nháp<textarea className="field-input" required rows={8} value={draft.content} onChange={e => setDraft(current => ({ ...current, content: e.target.value }))} /></label>
          {error && <p role="alert">{error}</p>}<button type="submit" className="admin-primary">Lưu bản nháp</button>
        </fieldset></form>
      </Modal>}
      <button
        type="button"
        aria-pressed={preview}
        onClick={() => setPreview((value) => !value)}
        className="admin-secondary"
      >
        {preview ? 'Ẩn xem trước' : 'Xem trước nội dung'}
      </button>
      {preview && detail && (
        <article className="rounded-xl border border-[#E2E5DE] bg-white p-6">
          <h2 className="font-serif text-2xl">{title}</h2>
          <p className="mt-4 whitespace-pre-wrap leading-7">{content}</p>
        </article>
      )}
      {error && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      )}
      {loading ? (
        <div className="p-8 text-center text-sm text-[#687069]">Đang tải...</div>
      ) : pages.length === 0 ? (
        <div className="border border-[#E8E9E3] bg-white p-8 text-center text-sm text-[#687069]">
          Chưa có trang nội dung để chỉnh sửa.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="border border-[#E8E9E3] bg-white p-3">
            <p className="px-2 pb-2 text-xs font-bold uppercase text-[#687069]">Trang nội dung</p>
            <ListSearch
              label="Tìm trang nội dung"
              value={search}
              onChange={setSearch}
              count={filteredPages.length}
            />
            {filteredPages.length === 0 && (
              <p className="p-3 text-sm">Không có trang khớp tìm kiếm.</p>
            )}
            <div className="space-y-1">
              {filteredPages.map((page) => (
                <button
                  key={page.page_id}
                  type="button"
                  onClick={() => {
                    if (!saving && canDiscard()) selectPage(page);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm ${selectedId === page.page_id ? 'bg-[#0B2419] text-white' : 'hover:bg-[#F5F6F2]'}`}
                >
                  <span className="block font-semibold">{page.title}</span>
                  <span className="block font-mono text-[10px] opacity-70">{page.page_code}</span>
                </button>
              ))}
            </div>
          </aside>
          <form onSubmit={save} className="border border-[#E8E9E3] bg-white p-5">
            <fieldset disabled={saving || detailLoading || !detail} className="contents">
              {detailLoading && <p role="status">Đang tải nội dung trang...</p>}
              {detail && <div className="mb-4 flex flex-wrap items-center gap-3">
                <p>Trạng thái: {detail.status === 'PUBLISHED' ? 'Đã công bố' : detail.status === 'ARCHIVED' ? 'Đã lưu trữ' : 'Bản nháp'}</p>
                {canWrite && <>
                  {detail.status === 'DRAFT' && <button type="button" className="admin-primary" onClick={() => void changeStatus('PUBLISHED')}>Công bố</button>}
                  {detail.status === 'PUBLISHED' && <button type="button" className="admin-secondary" onClick={() => void changeStatus('DRAFT')}>Gỡ công bố</button>}
                  {detail.status !== 'ARCHIVED' && <button type="button" className="admin-secondary" onClick={() => void changeStatus('ARCHIVED')}>Lưu trữ</button>}
                  {detail.status === 'ARCHIVED' && <button type="button" className="admin-secondary" onClick={() => void changeStatus('DRAFT')}>Khôi phục bản nháp</button>}
                </>}
              </div>}
              <label className="block text-xs font-semibold">
                Tiêu đề
                <input
                  disabled={!canWrite}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={255}
                  className="mt-1 w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                />
              </label>
              <label className="mt-4 block text-xs font-semibold">
                Nội dung
                <textarea
                  disabled={!canWrite}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={18}
                  className="mt-1 w-full border border-[#D9DDD6] px-3 py-2 text-sm leading-6"
                />
              </label>
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-[#687069]">
                  Kiểm tra bản xem trước trước khi lưu nội dung.
                </p>
                <button
                  type="submit"
                  disabled={
                    !canWrite || saving || detailLoading || !detail || selectedId == null || !title.trim() || !content.trim()
                  }
                  className="bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu nội dung'}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      )}
    </section>
  );
};
