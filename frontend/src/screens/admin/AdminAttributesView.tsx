import React, { useMemo, useState } from 'react';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { useAdminAttributes } from '../../features/catalog/hooks/useAdminAttributes';

interface Props {
  showToast: (message: string) => void;
  canWrite: boolean;
}

interface AttributeCreateDraft {
  code: string;
  name: string;
  isRequired: boolean;
  isVariantDefining: boolean;
}

interface AttributeEditDraft {
  name: string;
  isRequired: boolean;
  isVariantDefining: boolean;
  sortOrder: string;
}

interface OptionDraft {
  value: string;
  label: string;
}

interface OptionEditDraft {
  attributeId: number;
  optionId: number;
  label: string;
  sortOrder: string;
}

const nextSortOrder = (values: number[]): number => Math.max(-1, ...values) + 1;

export const AdminAttributesView: React.FC<Props> = ({ showToast, canWrite }) => {
  const { meta, loading, busy, error, refresh, runMutation } = useAdminAttributes(showToast);
  const [search, setSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<AttributeCreateDraft>({
    code: '',
    name: '',
    isRequired: false,
    isVariantDefining: false,
  });
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [attributeEditDraft, setAttributeEditDraft] = useState<AttributeEditDraft>({
    name: '',
    isRequired: false,
    isVariantDefining: false,
    sortOrder: '',
  });
  const [optionDrafts, setOptionDrafts] = useState<Record<number, OptionDraft>>({});
  const [editingOption, setEditingOption] = useState<OptionEditDraft | null>(null);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const attributes = useMemo(
    () =>
      (meta?.attributes ?? []).filter((attribute) =>
        `${attribute.code} ${attribute.name}`
          .toLocaleLowerCase()
          .includes(normalizedSearch),
      ),
    [meta, normalizedSearch],
  );

  const createAttribute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWrite || busy) return;

    const code = createDraft.code.trim();
    const name = createDraft.name.trim();
    if (!code || code.length > 80 || !name || name.length > 150) {
      setValidationError('Nhập mã và tên thuộc tính hợp lệ.');
      return;
    }

    setValidationError(null);
    const sortOrder = nextSortOrder((meta?.attributes ?? []).map((attribute) => attribute.sort_order));
    const succeeded = await runMutation(
      () =>
        adminCatalogMetaService.createAttribute({
          code,
          name,
          is_required: createDraft.isRequired,
          is_variant_defining: createDraft.isVariantDefining,
          sort_order: sortOrder,
        }),
      'Không thể tạo thuộc tính.',
      'Đã tạo thuộc tính.',
    );

    if (succeeded) {
      setCreateDraft({
        code: '',
        name: '',
        isRequired: false,
        isVariantDefining: false,
      });
    }
  };

  const beginAttributeEdit = (attribute: NonNullable<typeof meta>['attributes'][number]) => {
    setEditingAttributeId(attribute.id);
    setAttributeEditDraft({
      name: attribute.name,
      isRequired: attribute.is_required,
      isVariantDefining: attribute.is_variant_defining,
      sortOrder: String(attribute.sort_order),
    });
  };

  const saveAttribute = async (attributeId: number) => {
    if (!canWrite || busy) return;
    const name = attributeEditDraft.name.trim();
    const sortOrderText = attributeEditDraft.sortOrder.trim();
    const sortOrder = Number(sortOrderText);
    if (
      !name ||
      name.length > 150 ||
      !sortOrderText ||
      !Number.isSafeInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setValidationError('Nhập tên thuộc tính và thứ tự là số nguyên không âm.');
      return;
    }

    setValidationError(null);
    const succeeded = await runMutation(
      () =>
        adminCatalogMetaService.updateAttribute(attributeId, {
          name,
          is_required: attributeEditDraft.isRequired,
          is_variant_defining: attributeEditDraft.isVariantDefining,
          sort_order: sortOrder,
        }),
      'Không thể cập nhật thuộc tính.',
      'Đã cập nhật thuộc tính.',
    );
    if (succeeded) setEditingAttributeId(null);
  };

  const addOption = async (
    event: React.FormEvent<HTMLFormElement>,
    attribute: NonNullable<typeof meta>['attributes'][number],
  ) => {
    event.preventDefault();
    if (!canWrite || busy) return;
    const draft = optionDrafts[attribute.id] ?? { value: '', label: '' };
    const value = draft.value.trim();
    const label = draft.label.trim();
    if (!value || value.length > 120 || !label || label.length > 150) {
      setValidationError('Nhập mã option (tối đa 120 ký tự) và nhãn option (tối đa 150 ký tự).');
      return;
    }

    setValidationError(null);
    const sortOrder = nextSortOrder(attribute.options.map((option) => option.sort_order));
    const succeeded = await runMutation(
      () =>
        adminCatalogMetaService.createAttributeOption(attribute.id, {
          value,
          label,
          sort_order: sortOrder,
        }),
      'Không thể tạo option.',
      'Đã tạo Attribute Option.',
    );
    if (succeeded) {
      setOptionDrafts((current) => ({ ...current, [attribute.id]: { value: '', label: '' } }));
    }
  };

  const beginOptionEdit = (
    attributeId: number,
    option: NonNullable<typeof meta>['attributes'][number]['options'][number],
  ) => {
    setEditingOption({
      attributeId,
      optionId: option.id,
      label: option.label,
      sortOrder: String(option.sort_order),
    });
  };

  const saveOption = async () => {
    if (!canWrite || busy || !editingOption) return;
    const label = editingOption.label.trim();
    const sortOrderText = editingOption.sortOrder.trim();
    const sortOrder = Number(sortOrderText);
    if (
      !label ||
      label.length > 150 ||
      !sortOrderText ||
      !Number.isSafeInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setValidationError('Nhập nhãn option và thứ tự là số nguyên không âm.');
      return;
    }

    setValidationError(null);
    const succeeded = await runMutation(
      () =>
        adminCatalogMetaService.updateAttributeOption(
          editingOption.attributeId,
          editingOption.optionId,
          { label, sort_order: sortOrder },
        ),
      'Không thể cập nhật option.',
      'Đã cập nhật Attribute Option.',
    );
    if (succeeded) setEditingOption(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">
            Catalog master data
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#0B2419]">
            Quản lý thuộc tính
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#606863]">
            Mỗi Attribute quản lý một danh sách Option. Product lưu lựa chọn bằng các attribute_value_id; không phát sinh biến thể tự động.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void refresh()}
          className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase disabled:opacity-40"
        >
          Làm mới
        </button>
      </header>

      {(error || validationError) && (
        <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || validationError}
        </div>
      )}
      {loading && meta && (
        <p role="status" className="text-sm text-[#606863]">Đang làm mới dữ liệu thuộc tính...</p>
      )}
      {!canWrite && (
        <div className="border border-[#E2E5DE] bg-[#F8FAF4] p-3 text-sm text-[#606863]">
          Chế độ chỉ đọc. Cần CATALOG_WRITE để tạo hoặc sửa thuộc tính và option.
        </div>
      )}

      {canWrite && (
        <form
          onSubmit={(event) => void createAttribute(event)}
          className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="space-y-1">
            <span className="text-xs font-semibold">Mã thuộc tính *</span>
            <input
              aria-label="Mã thuộc tính"
              value={createDraft.code}
              maxLength={80}
              required
              disabled={busy || loading || !meta}
              onChange={(event) => setCreateDraft((current) => ({ ...current, code: event.target.value }))}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold">Tên thuộc tính mới *</span>
            <input
              aria-label="Tên thuộc tính mới"
              value={createDraft.name}
              maxLength={150}
              required
              disabled={busy || loading || !meta}
              onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
            />
          </label>
<div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label="Bắt buộc khi tạo"
                checked={createDraft.isRequired}
                disabled={busy || loading || !meta}
                onChange={(event) => setCreateDraft((current) => ({ ...current, isRequired: event.target.checked }))}
              />
              Bắt buộc
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label="Phân biệt khi tạo"
                checked={createDraft.isVariantDefining}
                disabled={busy || loading || !meta}
                onChange={(event) => setCreateDraft((current) => ({ ...current, isVariantDefining: event.target.checked }))}
              />
              Đánh dấu thuộc tính phân biệt
            </label>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" disabled={busy || loading || !meta} className="admin-primary">
              {busy ? 'Đang xử lý...' : 'Tạo thuộc tính'}
            </button>
          </div>
        </form>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="text-xs font-semibold">Tìm thuộc tính</span>
            <input
              aria-label="Tìm thuộc tính"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              placeholder="Mã hoặc tên thuộc tính"
            />
          </label>
          {search.trim() && (
            <button type="button" className="admin-secondary" onClick={() => setSearch('')}>
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {loading && !meta && (
          <div role="status" className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">
            Đang tải danh sách thuộc tính...
          </div>
        )}
        {!loading && !meta && error && (
          <div className="rounded-lg border border-[#E2E5DE] bg-white p-6 text-sm text-[#606863]">
            Chưa thể hiển thị danh sách vì không tải được metadata. Hãy thử làm mới.
          </div>
        )}
        {meta && meta.attributes.length === 0 && (
          <p role="status" className="admin-state">Chưa có thuộc tính được cấu hình.</p>
        )}
        {meta && meta.attributes.length > 0 && attributes.length === 0 && (
          <p role="status" className="admin-state">Không có thuộc tính khớp bộ lọc.</p>
        )}

        {attributes.map((attribute) => {
          const editingAttribute = editingAttributeId === attribute.id;
          const optionDraft = optionDrafts[attribute.id] ?? { value: '', label: '' };
          return (
            <article
              key={attribute.id}
              className="rounded-lg border border-[#E2E5DE] bg-white p-5"
              aria-labelledby={`attribute-heading-${attribute.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={`attribute-heading-${attribute.id}`} className="font-semibold text-[#0B2419]">
                    {attribute.name}
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-[#606863]">
                    <code>{attribute.code}</code>
                    <span aria-hidden="true">·</span>
                    <span>Thứ tự {attribute.sort_order}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="border border-[#D9DDD6] px-2 py-1">
                    {attribute.is_required ? 'Bắt buộc' : 'Không bắt buộc'}
                  </span>
                  <span className="border border-[#D9DDD6] px-2 py-1">
                    {attribute.is_variant_defining ? 'Có cờ phân biệt' : 'Không có cờ phân biệt'}
                  </span>
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
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveAttribute(attribute.id);
                  }}
                  className="mt-4 grid gap-3 border-t border-[#E8E9E3] pt-4 md:grid-cols-2"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-semibold">Mã thuộc tính (không sửa được)</span>
                    <p className="border border-[#E8E9E3] bg-[#F8FAF4] px-3 py-2 text-sm">
                      {attribute.code}
                    </p>
                  </div>
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
                      aria-label={`Bắt buộc ${attribute.code}`}
                      checked={attributeEditDraft.isRequired}
                      disabled={busy}
                      onChange={(event) => setAttributeEditDraft((current) => ({ ...current, isRequired: event.target.checked }))}
                    />
                    Bắt buộc
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      aria-label={`Phân biệt ${attribute.code}`}
                      checked={attributeEditDraft.isVariantDefining}
                      disabled={busy}
                      onChange={(event) => setAttributeEditDraft((current) => ({ ...current, isVariantDefining: event.target.checked }))}
                    />
                    Đánh dấu thuộc tính phân biệt
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button type="submit" disabled={busy} className="admin-primary">
                      Lưu thuộc tính
                    </button>
                    <button type="button" disabled={busy} className="admin-secondary" onClick={() => setEditingAttributeId(null)}>
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {(
                <div className="mt-5 space-y-3 border-t border-[#E8E9E3] pt-4">
                  <h3 className="text-sm font-semibold">Options</h3>
                  {attribute.options.length === 0 && (
                    <p className="text-sm text-[#606863]">Chưa có option cho thuộc tính này.</p>
                  )}
                  {attribute.options.map((option) => {
                    const isEditingOption =
                      editingOption?.attributeId === attribute.id && editingOption.optionId === option.id;
                    return (
                      <div
                        key={option.id}
                        data-option-id={option.id}
                        className="border-b border-[#E8E9E3] py-2 text-sm"
                      >
                        {isEditingOption && editingOption ? (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveOption();
                            }}
                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
                          >
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
                              <button type="submit" disabled={busy} className="admin-primary">
                                Lưu
                              </button>
                              <button type="button" disabled={busy} className="admin-secondary" onClick={() => setEditingOption(null)}>
                                Hủy
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">{option.label}</p>
                              <code className="text-xs text-[#606863]">
                                Giá trị: {option.value} · Thứ tự {option.sort_order}
                              </code>
                            </div>
                            {canWrite && (
                              <button
                                type="button"
                                disabled={busy}
                                className="admin-secondary"
                                onClick={() => beginOptionEdit(attribute.id, option)}
                              >
                                Sửa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {canWrite && (
                    <form
                      onSubmit={(event) => void addOption(event, attribute)}
                      className="grid gap-2 sm:grid-cols-3"
                    >
                      <label className="space-y-1">
                        <span className="text-xs font-semibold">Mã option</span>
                        <input
                          aria-label={`Mã option ${attribute.code}`}
                          placeholder="Mã option"
                          value={optionDraft.value}
                          maxLength={120}
                          required
                          disabled={busy}
                          onChange={(event) => setOptionDrafts((current) => ({
                            ...current,
                            [attribute.id]: { ...(current[attribute.id] ?? { value: '', label: '' }), value: event.target.value },
                          }))}
                          className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold">Nhãn option</span>
                        <input
                          aria-label={`Nhãn option mới ${attribute.code}`}
                          placeholder="Nhãn hiển thị"
                          value={optionDraft.label}
                          maxLength={150}
                          required
                          disabled={busy}
                          onChange={(event) => setOptionDrafts((current) => ({
                            ...current,
                            [attribute.id]: { ...(current[attribute.id] ?? { value: '', label: '' }), label: event.target.value },
                          }))}
                          className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="flex items-end">
                        <button type="submit" disabled={busy} className="admin-secondary">
                          Thêm option {attribute.code}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
};
