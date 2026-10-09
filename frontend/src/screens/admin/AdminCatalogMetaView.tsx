import { Modal } from '../../shared/admin/Modal';
import { getApiErrorMessage } from '../../services/http/apiError';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useEffect, useState } from 'react';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import type { CatalogMetaDto } from '../../features/catalog/types';

type Tab = 'categories' | 'brands' | 'sizes' | 'colors';

interface Props {
  initialTab?: Tab;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
}

export const AdminCatalogMetaView: React.FC<Props> = ({
  initialTab = 'categories',
  showToast,
  onNavigateTab,
  canWrite,
}) => {
  const activeTab = initialTab;
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ kind: Tab; id: number; name: string } | null>(null);
  const [nextName, setNextName] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [sizeDisplayName, setSizeDisplayName] = useState('');
  const [sizeCode, setSizeCode] = useState('');
  const [sizeSortOrder, setSizeSortOrder] = useState('0');

  const canDiscard = useDirtyForm(Boolean((renaming && nextName !== renaming.name) || name || code || parentId || sizeDisplayName || sizeCode || sizeSortOrder !== '0'));

  const load = async () => {
    setLoading(true);
    try {
      setMeta(await adminCatalogMetaService.getMeta());
      setError(null);
    } catch {
      setMeta(null);
      setError('Không thể tải catalog metadata hoặc tài khoản không có quyền CATALOG_READ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void adminCatalogMetaService.getMeta()
      .then((result) => {
        if (!active) return;
        setMeta(result);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setMeta(null);
        setError('Không thể tải catalog metadata hoặc tài khoản không có quyền CATALOG_READ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const clearForm = () => {
    setName('');
    setCode('');
    setParentId('');
    setSizeDisplayName('');
    setSizeCode('');
    setSizeSortOrder('0');
  };

  const createCurrent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (activeTab === 'categories') {
        const parsedParent = parentId ? Number(parentId) : null;
        if (parsedParent !== null && (!Number.isInteger(parsedParent) || parsedParent <= 0)) throw new Error('invalid');
        await adminCatalogMetaService.createCategory({ parent_category_id: parsedParent, name: name.trim() });
      } else if (activeTab === 'brands') {
        await adminCatalogMetaService.createBrand({ name: name.trim() });
      } else if (activeTab === 'colors') {
        if (!code.trim()) throw new Error('invalid');
        await adminCatalogMetaService.createColor({ code: code.trim(), name: name.trim() });
      } else {
        const sortOrder = Number(sizeSortOrder);
        if (!code.trim() || !sizeCode.trim() || !sizeDisplayName.trim() || !Number.isInteger(sortOrder)) throw new Error('invalid');
        await adminCatalogMetaService.createSizeSystem({
          code: code.trim(),
          name: name.trim(),
          size_values: [{ code: sizeCode.trim(), display_name: sizeDisplayName.trim(), sort_order: sortOrder }],
        });
      }
      clearForm();
      await load();
      showToast('Đã cập nhật catalog metadata.');
    } catch {
      setError('Không thể tạo metadata. Kiểm tra dữ liệu, quan hệ và quyền CATALOG_WRITE.');
    } finally {
      setBusy(false);
    }
  };

  const rename = async () => {
    if (!canWrite || !renaming || !nextName.trim() || busy) return;
    const { kind, id } = renaming;
    setBusy(true);
    setError(null);
    try {
      if (kind === 'categories') await adminCatalogMetaService.updateCategory(id, { name: nextName.trim() });
      if (kind === 'brands') await adminCatalogMetaService.updateBrand(id, { name: nextName.trim() });
      if (kind === 'colors') await adminCatalogMetaService.updateColor(id, { name: nextName.trim() });
      if (kind === 'sizes') await adminCatalogMetaService.updateSizeSystem(id, { name: nextName.trim() });
      setRenaming(null);
      await load();
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể cập nhật metadata.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (kind: Tab, id: number) => {
    if (!canWrite || busy || !window.confirm(`Xóa ${kind} #${id}? Mục sẽ bị xóa nếu không còn quan hệ tham chiếu.`)) return;
    setBusy(true);
    setError(null);
    try {
      if (kind === 'categories') await adminCatalogMetaService.deleteCategory(id);
      if (kind === 'brands') await adminCatalogMetaService.deleteBrand(id);
      if (kind === 'colors') await adminCatalogMetaService.deleteColor(id);
      if (kind === 'sizes') await adminCatalogMetaService.deleteSizeSystem(id);
      await load();
    } catch {
      setError('Không thể xóa metadata; mục có thể đang được tham chiếu hoặc actor không có quyền.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !meta) return <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">Đang tải catalog metadata...</div>;

  const rows = activeTab === 'categories'
    ? meta?.categories ?? []
    : activeTab === 'brands'
      ? meta?.brands ?? []
      : activeTab === 'colors'
        ? meta?.colors ?? []
        : meta?.size_systems ?? [];

  return (
    <div className="space-y-6">
      {renaming && <Modal title={`Đổi tên ${renaming.name}`} busy={busy} onClose={() => { if (canDiscard()) setRenaming(null); }}><form onSubmit={(event) => { event.preventDefault(); void rename(); }}><label>Tên mới<input required disabled={busy} maxLength={renaming.kind === 'colors' ? 100 : 150} value={nextName} onChange={(event) => setNextName(event.target.value)} /></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button type="submit" className="admin-primary" disabled={busy || !nextName.trim()}>Lưu tên</button></form></Modal>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Catalog master data</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#0B2419]">Metadata catalog</h1>
          <p className="mt-2 text-sm text-[#606863]">Dữ liệu lấy trực tiếp từ `/admin/catalog/meta`; không dùng danh sách mẫu.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => void load()} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase disabled:opacity-40">Làm mới</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['categories', 'brands', 'sizes', 'colors'] as Tab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => onNavigateTab(tab, tab)} aria-current={activeTab === tab ? 'page' : undefined} className={`px-4 py-2 text-xs font-bold uppercase ${activeTab === tab ? 'bg-[#0B2419] text-white' : 'border border-[#D9DDD6] bg-white'}`}>{{ categories: 'Danh mục', brands: 'Thương hiệu', sizes: 'Hệ size', colors: 'Màu sắc' }[tab]}</button>
        ))}
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!canWrite && <div className="border border-[#E2E5DE] bg-[#F8FAF4] p-3 text-sm text-[#606863]">Chế độ chỉ đọc. Cần CATALOG_WRITE để tạo, sửa hoặc xóa metadata.</div>}

      {canWrite && <form onSubmit={createCurrent} className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-5 md:grid-cols-2 xl:grid-cols-4"><fieldset disabled={busy} className="contents">
        <label className="space-y-1"><span className="text-xs font-semibold">Tên *</span><input value={name} maxLength={activeTab === 'colors' ? 100 : 150} onChange={(event) => setName(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label>
        {(activeTab === 'colors' || activeTab === 'sizes') && <label className="space-y-1"><span className="text-xs font-semibold">Code *</span><input value={code} maxLength={50} onChange={(event) => setCode(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label>}
        {activeTab === 'categories' && <label className="space-y-1"><span className="text-xs font-semibold">Danh mục cha</span><select value={parentId} onChange={(event) => setParentId(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Danh mục gốc</option>{meta?.categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}</select></label>}
        {activeTab === 'sizes' && <><label className="space-y-1"><span className="text-xs font-semibold">Size đầu tiên: code *</span><input value={sizeCode} maxLength={50} onChange={(event) => setSizeCode(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label><label className="space-y-1"><span className="text-xs font-semibold">Size đầu tiên: display *</span><input value={sizeDisplayName} maxLength={100} onChange={(event) => setSizeDisplayName(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label><label className="space-y-1"><span className="text-xs font-semibold">Sort order *</span><input type="number" value={sizeSortOrder} onChange={(event) => setSizeSortOrder(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label></>}
        <div className="flex items-end"><button type="submit" disabled={busy} className="w-full bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">{busy ? 'Đang xử lý...' : 'Tạo mới'}</button></div>
      </fieldset></form>}

      <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Thông tin</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-[#E2E5DE]">
            {rows.map((row) => {
              const id = 'category_id' in row ? row.category_id : 'brand_id' in row ? row.brand_id : 'color_id' in row ? row.color_id : row.size_system_id;
              const detail = 'parent_category_id' in row ? `parent: ${row.parent_category_id ?? 'root'}` : 'size_values' in row ? `${row.code} · ${row.size_values.length} size values` : 'code' in row ? row.code : '';
              return <tr key={id}><td className="px-4 py-3 font-mono">#{id}</td><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 text-xs text-[#606863]">{detail}</td><td className="px-4 py-3 text-right">{canWrite && <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => { setRenaming({ kind: activeTab, id, name: row.name }); setNextName(row.name); }} className="border border-[#D9DDD6] px-3 py-1.5 text-xs font-semibold">Đổi tên</button><button type="button" disabled={busy} onClick={() => void remove(activeTab, id)} className="border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Xóa</button></div>}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
