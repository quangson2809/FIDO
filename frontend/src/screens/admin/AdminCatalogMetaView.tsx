import React, { useCallback, useEffect, useState } from 'react';
import { catalogService } from '../../features/catalog/api/service';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import type { CatalogMetaDto } from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

type Tab = 'categories' | 'brands';
type RenameTarget = { kind: 'categories' | 'brands'; id: number; name: string };

interface Props {
  activeTab: Tab;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
}

export const AdminCatalogMetaView: React.FC<Props> = ({
  activeTab,
  showToast,
  onNavigateTab,
  canWrite,
}) => {
  const [metadataSearch, setMetadataSearch] = useState('');
  const [categoryLevel, setCategoryLevel] = useState<'all' | 'root' | 'child'>('all');
  const [publicMeta, setPublicMeta] = useState<CatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await catalogService.getMeta();
      setPublicMeta(catalog);
      setError(null);
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể tải catalog metadata.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const resetForm = () => {
    setName('');
    setParentId('');
  };

  const createCurrent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || busy || !name.trim()) return;

    setBusy(true);
    setError(null);
    try {
      if (activeTab === 'categories') {
        const parent = parentId.trim() ? Number(parentId) : null;
        if (parent !== null && (!Number.isSafeInteger(parent) || parent <= 0)) {
          throw new Error('Danh mục cha không hợp lệ.');
        }
        await adminCatalogMetaService.createCategory({
          name: name.trim(),
          parent_category_id: parent,
        });
      } else {
        await adminCatalogMetaService.createBrand({ name: name.trim() });
      }

      resetForm();
      await load();
      showToast('Đã cập nhật catalog metadata.');
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể tạo metadata.'));
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async () => {
    if (!canWrite || busy || !renameTarget || !renameValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (renameTarget.kind === 'categories') {
        await adminCatalogMetaService.updateCategory(renameTarget.id, { name: renameValue.trim() });
      } else {
        await adminCatalogMetaService.updateBrand(renameTarget.id, { name: renameValue.trim() });
      }
      setRenameTarget(null);
      setRenameValue('');
      await load();
      showToast('Đã cập nhật tên.');
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể cập nhật tên.'));
    } finally {
      setBusy(false);
    }
  };

  const removeMaster = async (kind: 'categories' | 'brands', id: number, label: string) => {
    if (!canWrite || busy || !window.confirm(`Xóa ${label}? Chỉ xóa được mục không còn được tham chiếu.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (kind === 'categories') await adminCatalogMetaService.deleteCategory(id);
      else await adminCatalogMetaService.deleteBrand(id);
      await load();
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể xóa metadata đang được tham chiếu.'));
    } finally {
      setBusy(false);
    }
  };

  const categories = publicMeta?.categories ?? [];
  const brands = publicMeta?.brands ?? [];
  const normalizedMetadataSearch = metadataSearch.trim().toLocaleLowerCase();
  const filteredCategories = categories.filter((category) => {
    const matchesSearch = `${category.name} ${category.slug ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedMetadataSearch);
    const matchesLevel = categoryLevel === 'all' ||
      (categoryLevel === 'root' ? category.parent_category_id === null : category.parent_category_id !== null);
    return matchesSearch && matchesLevel;
  });
  const filteredBrands = brands.filter((brand) =>
    `${brand.name} ${brand.slug ?? ''}`.toLocaleLowerCase().includes(normalizedMetadataSearch),
  );

  if (loading && !publicMeta) {
    return (
      <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">
        Đang tải catalog metadata...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">
            Catalog master data
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#0B2419]">
            Danh mục & thương hiệu
          </h1>
          <p className="mt-2 text-sm text-[#606863]">
            Quản lý danh mục và thương hiệu theo API backend.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void load()}
          className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase disabled:opacity-40"
        >
          Làm mới
        </button>
      </header>

      {error && (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {!canWrite && (
        <div className="border border-[#E2E5DE] bg-[#F8FAF4] p-3 text-sm text-[#606863]">
          Chế độ chỉ đọc. Cần CATALOG_WRITE để tạo, sửa hoặc xóa dữ liệu.
        </div>
      )}

      <nav aria-label="Catalog metadata" className="flex flex-wrap gap-2">
        {(['categories', 'brands'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => {
              setMetadataSearch('');
              setCategoryLevel('all');
              onNavigateTab(tab, tab);
              setError(null);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase ${activeTab === tab ? 'bg-[#0B2419] text-white' : 'border border-[#D9DDD6] bg-white'}`}
          >
            {{ categories: 'Danh mục', brands: 'Thương hiệu' }[tab]}
          </button>
        ))}
      </nav>

      {canWrite && (
        <form
          onSubmit={createCurrent}
          className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="space-y-1">
            <span className="text-xs font-semibold">Tên *</span>
            <input
              value={name}
              maxLength={150}
              onChange={(event) => setName(event.target.value)}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              disabled={busy}
              required
            />
          </label>
          {activeTab === 'categories' && (
            <label className="space-y-1">
              <span className="text-xs font-semibold">Danh mục cha</span>
              <select
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                disabled={busy}
              >
                <option value="">Danh mục gốc</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end gap-2">
            <button type="submit" disabled={busy} className="admin-primary">
              {busy ? 'Đang xử lý...' : 'Tạo mới'}
            </button>
            <button type="button" disabled={busy} onClick={resetForm} className="admin-secondary">
              Xóa nhập
            </button>
          </div>
        </form>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
            <label className="min-w-0 flex-1 space-y-1 text-sm">
              <span className="text-xs font-semibold">Tìm danh mục</span>
              <input
                aria-label="Tìm danh mục"
                value={metadataSearch}
                onChange={(event) => setMetadataSearch(event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                placeholder="Tên hoặc slug danh mục"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold">Cấp danh mục</span>
              <select aria-label="Cấp danh mục" value={categoryLevel} onChange={(event) => setCategoryLevel(event.target.value as typeof categoryLevel)} className="border border-[#D9DDD6] px-3 py-2 text-sm">
                <option value="all">Tất cả cấp</option>
                <option value="root">Danh mục gốc</option>
                <option value="child">Danh mục con</option>
              </select>
            </label>
            {metadataSearch.trim() && <button type="button" className="admin-secondary" onClick={() => setMetadataSearch('')}>Xóa tìm kiếm</button>}
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]">
              <tr><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Quan hệ</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {filteredCategories.map((category) => (
                <tr key={category.category_id}>
                  <td className="px-4 py-3 font-semibold">{category.name}</td>
                  <td className="px-4 py-3 text-xs text-[#606863]">
                    {category.parent_category_id === null ? 'Danh mục gốc' : `Danh mục cha #${category.parent_category_id}`}
                    <span className="ml-2">{category.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && (
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={busy} className="admin-secondary" onClick={() => {
                          setRenameTarget({ kind: 'categories', id: category.category_id, name: category.name });
                          setRenameValue(category.name);
                        }}>Đổi tên</button>
                        <button type="button" disabled={busy} className="admin-danger" onClick={() => void removeMaster('categories', category.category_id, category.name)}>Xóa</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === 'brands' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
            <label className="min-w-0 flex-1 space-y-1 text-sm">
              <span className="text-xs font-semibold">Tìm thương hiệu</span>
              <input
                aria-label="Tìm thương hiệu"
                value={metadataSearch}
                onChange={(event) => setMetadataSearch(event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                placeholder="Tên hoặc slug thương hiệu"
              />
            </label>
            {metadataSearch.trim() && <button type="button" className="admin-secondary" onClick={() => setMetadataSearch('')}>Xóa tìm kiếm</button>}
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]">
              <tr><th className="px-4 py-3">Thương hiệu</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {filteredBrands.map((brand) => (
                <tr key={brand.brand_id}>
                  <td className="px-4 py-3 font-semibold">{brand.name}</td>
                  <td className="px-4 py-3 text-xs text-[#606863]">{brand.status}</td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && (
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={busy} className="admin-secondary" onClick={() => {
                          setRenameTarget({ kind: 'brands', id: brand.brand_id, name: brand.name });
                          setRenameValue(brand.name);
                        }}>Đổi tên</button>
                        <button type="button" disabled={busy} className="admin-danger" onClick={() => void removeMaster('brands', brand.brand_id, brand.name)}>Xóa</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {renameTarget && canWrite && (
        <div role="dialog" aria-modal="true" aria-label="Đổi tên metadata" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={(event) => { event.preventDefault(); void saveRename(); }} className="w-full max-w-md space-y-4 rounded-lg bg-white p-5">
            <h2 className="font-semibold">Đổi tên: {renameTarget.name}</h2>
            <input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2" maxLength={150} required />
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} className="admin-secondary" onClick={() => setRenameTarget(null)}>Hủy</button>
              <button type="submit" disabled={busy || !renameValue.trim()} className="admin-primary">Lưu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
