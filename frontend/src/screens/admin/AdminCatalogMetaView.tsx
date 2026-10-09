import { Modal } from '../../shared/admin/Modal';
import { ApiClientError, getApiErrorMessage } from '../../services/http/apiError';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useEffect, useState } from 'react';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import type { CatalogMetaDto, SizeSystemDto, SizeSystemPatchInput } from '../../features/catalog/types';

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
  const [sizeValues, setSizeValues] = useState<NonNullable<SizeSystemPatchInput['size_values']>>([]);
  const [editingSizes, setEditingSizes] = useState<SizeSystemDto | null>(null);
  const [sizeValuesDirty, setSizeValuesDirty] = useState(false);

  const canDiscard = useDirtyForm(Boolean((renaming && nextName !== renaming.name) || name || code || parentId || sizeValuesDirty));

  const validateSizes = () => {
    const codes = new Set<string>();
    for (const value of sizeValues) {
      const normalized = value.code.trim().toLowerCase();
      if (!normalized || !value.display_name.trim() || !Number.isInteger(value.sort_order)
        || value.sort_order < -2147483648 || value.sort_order > 2147483647) {
        throw new Error('Nhập code, tên hiển thị và thứ tự nguyên hợp lệ cho từng size.');
      }
      if (codes.has(normalized)) throw new Error('Code size không được trùng trong cùng hệ.');
      codes.add(normalized);
    }
    return sizeValues.map((value) => ({ ...value, code: value.code.trim(), display_name: value.display_name.trim() }));
  };

  const saveSizes = async () => {
    if (!canWrite || !editingSizes || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await adminCatalogMetaService.updateSizeSystem(editingSizes.size_system_id, { size_values: validateSizes() });
      setMeta((current) => current ? { ...current, size_systems: current.size_systems.map((system) => system.size_system_id === updated.size_system_id ? updated : system) } : current);
      setEditingSizes(null);
      setSizeValues([]);
      setSizeValuesDirty(false);
      showToast('Đã lưu danh sách size.');
    } catch (failure: unknown) {
      setError(failure instanceof ApiClientError && failure.status === 409 ? 'Không thể lưu: size đang được sử dụng không được xóa hoặc đổi code/tên; code size phải duy nhất.' : getApiErrorMessage(failure, 'Không thể lưu danh sách size.'));
    } finally {
      setBusy(false);
    }
  };

  const sizeFields = (
    <div className="space-y-3 col-span-full">
      <p className="text-sm">Size đã được sử dụng chỉ có thể đổi thứ tự. Xóa một dòng rồi lưu để xóa size.</p>
      {sizeValues.map((value, index) => (
        <div key={value.size_value_id ?? `new-${index}`} className="flex flex-wrap gap-2">
          {value.size_value_id && <span>#{value.size_value_id}</span>}
          <label>Code<input required maxLength={50} value={value.code} onChange={(event) => { setSizeValues(sizeValues.map((item, i) => i === index ? { ...item, code: event.target.value } : item)); setSizeValuesDirty(true); }} /></label>
          <label>Tên hiển thị<input required maxLength={100} value={value.display_name} onChange={(event) => { setSizeValues(sizeValues.map((item, i) => i === index ? { ...item, display_name: event.target.value } : item)); setSizeValuesDirty(true); }} /></label>
          <label>Thứ tự<input required type="number" step="1" min={-2147483648} max={2147483647} value={Number.isNaN(value.sort_order) ? '' : value.sort_order} onChange={(event) => { setSizeValues(sizeValues.map((item, i) => i === index ? { ...item, sort_order: event.target.valueAsNumber } : item)); setSizeValuesDirty(true); }} /></label>
          <button type="button" onClick={() => { setSizeValues(sizeValues.filter((_, i) => i !== index)); setSizeValuesDirty(true); }}>Xóa dòng {index + 1}</button>
        </div>
      ))}
      <button type="button" onClick={() => { setSizeValues([...sizeValues, { code: '', display_name: '', sort_order: sizeValues.length }]); setSizeValuesDirty(true); }}>Thêm size</button>
    </div>
  );

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
    setSizeValues([]);
    setSizeValuesDirty(false);
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
        if (!code.trim()) throw new Error('Nhập code hệ size.');
        await adminCatalogMetaService.createSizeSystem({
          code: code.trim(),
          name: name.trim(),
          size_values: validateSizes(),
        });
      }
      clearForm();
      await load();
      showToast('Đã cập nhật catalog metadata.');
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể tạo metadata. Kiểm tra dữ liệu, quan hệ và quyền CATALOG_WRITE.'));
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
      {editingSizes && canWrite && <Modal title={`Danh sách size: ${editingSizes.name}`} busy={busy} onClose={() => { if (canDiscard()) { setEditingSizes(null); setSizeValues([]); setSizeValuesDirty(false); } }}><form onSubmit={(event) => { event.preventDefault(); void saveSizes(); }}><fieldset disabled={busy}>{sizeFields}<button type="submit" className="admin-primary">{busy ? 'Đang lưu...' : 'Lưu danh sách size'}</button></fieldset>{error && <p role="alert">{error}</p>}</form></Modal>}
      {renaming && <Modal title={`Đổi tên ${renaming.name}`} busy={busy} onClose={() => { if (canDiscard()) setRenaming(null); }}><form onSubmit={(event) => { event.preventDefault(); void rename(); }}><label>Tên mới<input required disabled={busy} maxLength={renaming.kind === 'colors' ? 100 : 150} value={nextName} onChange={(event) => setNextName(event.target.value)} /></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button type="submit" className="admin-primary" disabled={busy || !nextName.trim()}>Lưu tên</button></form></Modal>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Catalog master data</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#0B2419]">Danh mục & thuộc tính</h1>
          <p className="mt-2 text-sm text-[#606863]">Quản lý danh mục, thương hiệu, hệ size và màu dùng cho sản phẩm.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => void load()} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase disabled:opacity-40">Làm mới</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['categories', 'brands', 'sizes', 'colors'] as Tab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => onNavigateTab(tab, tab)} aria-current={activeTab === tab ? 'page' : undefined} className={`px-4 py-2 text-xs font-bold uppercase ${activeTab === tab ? 'bg-[#0B2419] text-white' : 'border border-[#D9DDD6] bg-white'}`}>{{ categories: 'Danh mục', brands: 'Thương hiệu', sizes: 'Hệ size', colors: 'Màu sắc' }[tab]}</button>
        ))}
      </div>

      {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!canWrite && <div className="border border-[#E2E5DE] bg-[#F8FAF4] p-3 text-sm text-[#606863]">Chế độ chỉ đọc. Cần CATALOG_WRITE để tạo, sửa hoặc xóa metadata.</div>}

      {canWrite && !editingSizes && <form onSubmit={createCurrent} className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-5 md:grid-cols-2 xl:grid-cols-4"><fieldset disabled={busy} className="contents">
        <label className="space-y-1"><span className="text-xs font-semibold">Tên *</span><input value={name} maxLength={activeTab === 'colors' ? 100 : 150} onChange={(event) => setName(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label>
        {(activeTab === 'colors' || activeTab === 'sizes') && <label className="space-y-1"><span className="text-xs font-semibold">Code *</span><input value={code} maxLength={50} onChange={(event) => setCode(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" required /></label>}
        {activeTab === 'categories' && <label className="space-y-1"><span className="text-xs font-semibold">Danh mục cha</span><select value={parentId} onChange={(event) => setParentId(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Danh mục gốc</option>{meta?.categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}</select></label>}
        {activeTab === 'sizes' && sizeFields}
        <div className="flex items-end"><button type="submit" disabled={busy} className="w-full bg-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">{busy ? 'Đang xử lý...' : 'Tạo mới'}</button></div>
      </fieldset></form>}

      <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Thông tin</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-[#E2E5DE]">
            {rows.map((row) => {
              const id = 'category_id' in row ? row.category_id : 'brand_id' in row ? row.brand_id : 'color_id' in row ? row.color_id : row.size_system_id;
              const detail = 'parent_category_id' in row ? `parent: ${row.parent_category_id ?? 'root'}` : 'size_values' in row ? `${row.code} · ${row.size_values.length} size values` : 'code' in row ? row.code : '';
              return <tr key={id}><td className="px-4 py-3 font-mono">#{id}</td><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 text-xs text-[#606863]">{detail}{'size_values' in row && <ul>{row.size_values.map((value) => <li key={value.size_value_id}>#{value.size_value_id} · {value.code} · {value.display_name} · Thứ tự {value.sort_order}</li>)}</ul>}</td><td className="px-4 py-3 text-right">{canWrite && <div className="flex justify-end gap-2">{'size_values' in row && <button type="button" disabled={busy} onClick={() => { if (!canDiscard()) return; clearForm(); setEditingSizes(row); setSizeValues(row.size_values.map(({ size_value_id, code, display_name, sort_order }) => ({ size_value_id, code, display_name, sort_order }))); setError(null); }}>Quản lý size</button>}<button type="button" disabled={busy} onClick={() => { setRenaming({ kind: activeTab, id, name: row.name }); setNextName(row.name); }} className="border border-[#D9DDD6] px-3 py-1.5 text-xs font-semibold">Đổi tên</button><button type="button" disabled={busy} onClick={() => void remove(activeTab, id)} className="border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Xóa</button></div>}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
