import React, { useCallback, useEffect, useState } from 'react';
import { catalogService } from '../../features/catalog/api/service';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import type { AdminCatalogMetaDto, CatalogMetaDto } from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

type Tab = 'categories' | 'brands' | 'attributes';
type RenameTarget = { kind: 'categories' | 'brands'; id: number; name: string };

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
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [publicMeta, setPublicMeta] = useState<CatalogMetaDto | null>(null);
  const [adminMeta, setAdminMeta] = useState<AdminCatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [attributeTypeId, setAttributeTypeId] = useState('');
  const [attributeCode, setAttributeCode] = useState('');
  const [attributeRequired, setAttributeRequired] = useState(false);
  const [variantDefining, setVariantDefining] = useState(false);
  const [optionDrafts, setOptionDrafts] = useState<Record<number, { value: string; label: string }>>({});
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [attributeEditDraft, setAttributeEditDraft] = useState({
    name: '',
    required: false,
    variantDefining: false,
    sortOrder: '',
  });
  const [editingOption, setEditingOption] = useState<{
    attributeId: number;
    optionId: number;
    label: string;
    sortOrder: string;
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, adminCatalog] = await Promise.all([
        catalogService.getMeta(),
        adminCatalogMetaService.getMeta(),
      ]);
      setPublicMeta(catalog);
      setAdminMeta(adminCatalog);
      setError(null);
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể tải catalog metadata.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setParentId('');
    setAttributeTypeId('');
    setAttributeCode('');
    setAttributeRequired(false);
    setVariantDefining(false);
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
      } else if (activeTab === 'brands') {
        await adminCatalogMetaService.createBrand({ name: name.trim() });
      } else {
        const typeId = Number(attributeTypeId);
        if (!Number.isSafeInteger(typeId) || typeId <= 0 || !attributeCode.trim()) {
          throw new Error('Chọn kiểu dữ liệu và nhập mã thuộc tính hợp lệ.');
        }
        await adminCatalogMetaService.createAttribute({
          attribute_type_id: typeId,
          code: attributeCode.trim(),
          name: name.trim(),
          is_required: attributeRequired,
          is_variant_defining: variantDefining,
          sort_order: Math.max(-1, ...(adminMeta?.attributes.map((attribute) => attribute.sort_order) ?? []) ) + 1,
        });
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

  const beginAttributeEdit = (attribute: AdminCatalogMetaDto['attributes'][number]) => {
    setEditingAttributeId(attribute.id);
    setAttributeEditDraft({
      name: attribute.name,
      required: attribute.is_required,
      variantDefining: attribute.is_variant_defining,
      sortOrder: String(attribute.sort_order),
    });
    setError(null);
  };

  const saveAttribute = async () => {
    if (!canWrite || busy || editingAttributeId === null) return;
    const nameValue = attributeEditDraft.name.trim();
    const sortOrder = Number(attributeEditDraft.sortOrder);
    if (!nameValue || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setError('Tên và thứ tự thuộc tính phải hợp lệ.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await adminCatalogMetaService.updateAttribute(editingAttributeId, {
        name: nameValue,
        is_required: attributeEditDraft.required,
        is_variant_defining: attributeEditDraft.variantDefining,
        sort_order: sortOrder,
      });
      setEditingAttributeId(null);
      await load();
      showToast('Đã cập nhật thuộc tính.');
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể cập nhật thuộc tính.'));
    } finally {
      setBusy(false);
    }
  };

  const beginOptionEdit = (attributeId: number, option: AdminCatalogMetaDto['attributes'][number]['options'][number]) => {
    setEditingOption({
      attributeId,
      optionId: option.id,
      label: option.label,
      sortOrder: String(option.sort_order),
    });
    setError(null);
  };

  const saveOption = async () => {
    if (!canWrite || busy || !editingOption) return;
    const label = editingOption.label.trim();
    const sortOrder = Number(editingOption.sortOrder);
    if (!label || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setError('Nhãn và thứ tự option phải hợp lệ.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await adminCatalogMetaService.updateAttributeOption(
        editingOption.attributeId,
        editingOption.optionId,
        { label, sort_order: sortOrder },
      );
      setEditingOption(null);
      await load();
      showToast('Đã cập nhật Attribute Option.');
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể cập nhật option.'));
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

  const addOption = async (attributeId: number) => {
    if (!canWrite || busy) return;
    const draft = optionDrafts[attributeId];
    if (!draft?.value.trim() || !draft.label.trim()) {
      setError('Nhập cả mã option và nhãn hiển thị.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminCatalogMetaService.createAttributeOption(attributeId, {
        value: draft.value.trim(),
        label: draft.label.trim(),
        sort_order:
          Math.max(
            -1,
            ...(adminMeta?.attributes
              .find((attribute) => attribute.id === attributeId)
              ?.options.map((option) => option.sort_order) ?? []),
          ) + 1,
      });
      setOptionDrafts((current) => ({ ...current, [attributeId]: { value: '', label: '' } }));
      await load();
      showToast('Đã thêm Attribute Option.');
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể thêm option.'));
    } finally {
      setBusy(false);
    }
  };

  const categories = publicMeta?.categories ?? [];
  const brands = publicMeta?.brands ?? [];
  const attributes = adminMeta?.attributes ?? [];

  if (loading && !publicMeta && !adminMeta) {
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
            Danh mục & thuộc tính
          </h1>
          <p className="mt-2 text-sm text-[#606863]">
            Quản lý danh mục, thương hiệu và thuộc tính định kiểu theo API backend.
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
        {(['categories', 'brands', 'attributes'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => {
              setActiveTab(tab);
              onNavigateTab(tab, tab);
              setError(null);
            }}
            className={`px-4 py-2 text-xs font-bold uppercase ${activeTab === tab ? 'bg-[#0B2419] text-white' : 'border border-[#D9DDD6] bg-white'}`}
          >
            {{ categories: 'Danh mục', brands: 'Thương hiệu', attributes: 'Thuộc tính' }[tab]}
          </button>
        ))}
      </nav>

      {canWrite && (
        <form
          onSubmit={createCurrent}
          className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="space-y-1">
            <span className="text-xs font-semibold">{activeTab === 'attributes' ? 'Tên thuộc tính *' : 'Tên *'}</span>
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
          {activeTab === 'attributes' && (
            <>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Mã thuộc tính *</span>
                <input
                  value={attributeCode}
                  maxLength={80}
                  onChange={(event) => setAttributeCode(event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                  disabled={busy}
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold">Kiểu dữ liệu *</span>
                <select
                  value={attributeTypeId}
                  onChange={(event) => setAttributeTypeId(event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                  disabled={busy}
                  required
                >
                  <option value="">Chọn kiểu</option>
                  {(adminMeta?.attribute_types ?? []).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.code} · {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={attributeRequired}
                  onChange={(event) => setAttributeRequired(event.target.checked)}
                  disabled={busy}
                />
                Bắt buộc
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={variantDefining}
                  onChange={(event) => setVariantDefining(event.target.checked)}
                  disabled={busy}
                />
                Đánh dấu thuộc tính phân biệt
              </label>
            </>
          )}
          <div className="flex items-end gap-2">
            <button type="submit" disabled={busy} className="admin-primary">
              {busy ? 'Đang xử lý...' : activeTab === 'attributes' ? 'Tạo thuộc tính' : 'Tạo mới'}
            </button>
            <button type="button" disabled={busy} onClick={resetForm} className="admin-secondary">
              Xóa nhập
            </button>
          </div>
        </form>
      )}

      {activeTab === 'categories' && (
        <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]">
              <tr><th className="px-4 py-3">Tên</th><th className="px-4 py-3">Quan hệ</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {categories.map((category) => (
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
      )}

      {activeTab === 'brands' && (
        <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]">
              <tr><th className="px-4 py-3">Thương hiệu</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {brands.map((brand) => (
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
      )}

      {activeTab === 'attributes' && (
        <div className="space-y-4">
          {attributes.length === 0 && <p role="status" className="admin-state">Chưa có thuộc tính được cấu hình.</p>}
          {attributes.map((attribute) => {
            const optionDraft = optionDrafts[attribute.id] ?? { value: '', label: '' };
            const editingAttribute = editingAttributeId === attribute.id;
            return (
              <article key={attribute.id} className="rounded-lg border border-[#E2E5DE] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{attribute.name}</h2>
                    <p className="mt-1 text-xs text-[#606863]">
                      {attribute.code} · {attribute.data_type} · Thứ tự {attribute.sort_order}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="border px-2 py-1">{attribute.is_required ? 'Bắt buộc' : 'Không bắt buộc'}</span>
                    {attribute.is_variant_defining && <span className="border px-2 py-1">Đánh dấu phân biệt</span>}
                    {canWrite && !editingAttribute && (
                      <button
                        type="button"
                        disabled={busy}
                        className="admin-secondary"
                        onClick={() => beginAttributeEdit(attribute)}
                      >
                        Sửa thuộc tính
                      </button>
                    )}
                  </div>
                </div>
                {editingAttribute && canWrite && (
                  <form
                    onSubmit={(event) => { event.preventDefault(); void saveAttribute(); }}
                    className="mt-4 grid gap-3 border-t border-[#E8E9E3] pt-4 md:grid-cols-2"
                  >
                    <label className="space-y-1">
                      <span className="text-xs font-semibold">Tên thuộc tính</span>
                      <input
                        aria-label={`Tên thuộc tính ${attribute.code}`}
                        value={attributeEditDraft.name}
                        maxLength={150}
                        required
                        disabled={busy}
                        onChange={(event) => setAttributeEditDraft((current) => ({ ...current, name: event.target.value }))}
                        className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold">Thứ tự</span>
                      <input
                        aria-label={`Thứ tự thuộc tính ${attribute.code}`}
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={attributeEditDraft.sortOrder}
                        disabled={busy}
                        onChange={(event) => setAttributeEditDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                        className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={attributeEditDraft.required}
                        disabled={busy}
                        onChange={(event) => setAttributeEditDraft((current) => ({ ...current, required: event.target.checked }))}
                      />
                      Bắt buộc
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={attributeEditDraft.variantDefining}
                        disabled={busy}
                        onChange={(event) => setAttributeEditDraft((current) => ({ ...current, variantDefining: event.target.checked }))}
                      />
                      Đánh dấu phân biệt
                    </label>
                    <div className="flex gap-2 md:col-span-2">
                      <button type="submit" disabled={busy} className="admin-primary">Lưu thuộc tính</button>
                      <button type="button" disabled={busy} className="admin-secondary" onClick={() => setEditingAttributeId(null)}>Hủy</button>
                    </div>
                  </form>
                )}
                {attribute.data_type === 'OPTION' && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-semibold">Options</h3>
                    {attribute.options.map((option) => {
                      const isEditingOption =
                        editingOption?.attributeId === attribute.id &&
                        editingOption.optionId === option.id;
                      return (
                        <div key={option.id} className="border-b border-[#E8E9E3] py-2 text-sm">
                          {isEditingOption && editingOption ? (
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                              <label className="space-y-1">
                                <span className="text-xs font-semibold">Nhãn option</span>
                                <input
                                  aria-label={`Nhãn option ${option.value}`}
                                  value={editingOption.label}
                                  maxLength={150}
                                  required
                                  disabled={busy}
                                  onChange={(event) => setEditingOption((current) => current ? { ...current, label: event.target.value } : current)}
                                  className="w-full border border-[#D9DDD6] px-3 py-2"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-semibold">Thứ tự</span>
                                <input
                                  aria-label={`Thứ tự option ${option.value}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  required
                                  value={editingOption.sortOrder}
                                  disabled={busy}
                                  onChange={(event) => setEditingOption((current) => current ? { ...current, sortOrder: event.target.value } : current)}
                                  className="w-full border border-[#D9DDD6] px-3 py-2"
                                />
                              </label>
                              <div className="flex items-end gap-2">
                                <button type="button" disabled={busy} className="admin-primary" onClick={() => void saveOption()}>Lưu</button>
                                <button type="button" disabled={busy} className="admin-secondary" onClick={() => setEditingOption(null)}>Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>{option.label}</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-[#606863]">{option.value} · thứ tự {option.sort_order}</code>
                                {canWrite && <button type="button" disabled={busy} className="admin-secondary" onClick={() => beginOptionEdit(attribute.id, option)}>Sửa</button>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {canWrite && (
                      <form onSubmit={(event) => { event.preventDefault(); void addOption(attribute.id); }} className="grid gap-2 sm:grid-cols-3">
                        <input aria-label="Mã option" placeholder="Mã option" value={optionDraft.value} disabled={busy} onChange={(event) => setOptionDrafts((current) => ({ ...current, [attribute.id]: { ...optionDraft, value: event.target.value } }))} className="border border-[#D9DDD6] px-3 py-2 text-sm" required />
                        <input aria-label="Nhãn option" placeholder="Nhãn hiển thị" value={optionDraft.label} disabled={busy} onChange={(event) => setOptionDrafts((current) => ({ ...current, [attribute.id]: { ...optionDraft, label: event.target.value } }))} className="border border-[#D9DDD6] px-3 py-2 text-sm" required />
                        <button type="submit" disabled={busy} className="admin-secondary">Thêm option</button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          })}
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
