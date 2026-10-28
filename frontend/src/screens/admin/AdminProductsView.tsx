import React, { useCallback, useEffect, useState } from 'react';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { StatusBadge } from '../../shared/admin/StatusBadge';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { catalogService } from '../../features/catalog/api/service';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import { AdminProductTable } from '../../features/catalog/components/AdminProductTable';
import { ImageFilePreview } from '../../features/catalog/components/ImageFilePreview';
import { ProductAttributeFields } from '../../features/catalog/components/ProductAttributeFields';
import {
  attributeDraftFromValues,
  buildProductAttributeInputs,
  type ProductAttributeDraft,
} from '../../features/catalog/model/productAttributeForm';
import type {
  AdminCatalogMetaDto,
  AdminProductDetailDto,
  CatalogMetaDto,
  ProductCreateInput,
  ProductStatus,
} from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface AdminProductsViewProps {
  onSelectProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
}

interface ProductFormState {
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  parentProductId: string;
  sellingPrice: string;
  costPrice: string;
  description: string;
  status: ProductStatus;
}

const initialForm: ProductFormState = {
  sku: '',
  name: '',
  slug: '',
  categoryId: '',
  brandId: '',
  parentProductId: '',
  sellingPrice: '',
  costPrice: '',
  description: '',
  status: 'DRAFT',
};

const optionalId = (value: string): number | null | undefined => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({
  onSelectProduct,
  onEditProduct,
  onNavigateTab,
  showToast,
  canWrite,
}) => {
  const [catalogMeta, setCatalogMeta] = useState<CatalogMetaDto | null>(null);
  const [adminMeta, setAdminMeta] = useState<AdminCatalogMetaDto | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaRevision, setMetaRevision] = useState(0);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [parentFilterInput, setParentFilterInput] = useState('');
  const [parentFilter, setParentFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const list = useRemoteQuery(
    useCallback(
      () =>
        adminProductService.getProducts({
          q: query || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
          brand_id: brandId ? Number(brandId) : undefined,
          parent_product_id: parentFilter === '' ? undefined : parentFilter,
          status: status || undefined,
          page,
          page_size: pageSize,
        }),
      [query, categoryId, brandId, parentFilter, status, page, pageSize],
    ),
  );
  const products = list.data?.data ?? [];
  const pagination = list.data?.meta ?? null;
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [attributeDraft, setAttributeDraft] = useState<ProductAttributeDraft>({});
  const [images, setImages] = useState<File[]>([]);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialForm) ||
    JSON.stringify(attributeDraft) !==
      JSON.stringify(attributeDraftFromValues(adminMeta?.attributes ?? [], [])) ||
    images.length > 0;
  const canDiscard = useDirtyForm(isDirty);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) setMetaLoading(true);
        return Promise.all([catalogService.getMeta(), adminCatalogMetaService.getMeta()]);
      })
      .then(([catalog, admin]) => {
        if (!active) return;
        setCatalogMeta(catalog);
        setAdminMeta(admin);
        setAttributeDraft(attributeDraftFromValues(admin.attributes, []));
        setMetaError(null);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setMetaError(getApiErrorMessage(requestError, 'Không thể tải metadata catalog.'));
        }
      })
      .finally(() => {
        if (active) setMetaLoading(false);
      });
    return () => {
      active = false;
    };
  }, [metaRevision]);

  const updateForm = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const buildCreatePayload = (): { payload: ProductCreateInput | null; message: string | null } => {
    if (!catalogMeta || !adminMeta) {
      return { payload: null, message: 'Metadata catalog chưa sẵn sàng. Hãy tải lại metadata.' };
    }
    const parent = optionalId(form.parentProductId);
    const category = optionalId(form.categoryId);
    const brand = optionalId(form.brandId);
    const price = Number(form.sellingPrice);
    const cost = form.costPrice.trim() ? Number(form.costPrice) : null;

    if (parent === undefined) {
      return { payload: null, message: 'Mã Product cha phải là số nguyên dương.' };
    }
    if (
      category === undefined ||
      (category !== null &&
        !catalogMeta.categories.some(
          (item) => item.category_id === category && item.status === 'ACTIVE',
        ))
    ) {
      return { payload: null, message: 'Danh mục được chọn không hợp lệ hoặc không còn ACTIVE.' };
    }
    if (
      brand === undefined ||
      (brand !== null &&
        !catalogMeta.brands.some(
          (item) => item.brand_id === brand && item.status === 'ACTIVE',
        ))
    ) {
      return { payload: null, message: 'Thương hiệu được chọn không hợp lệ hoặc không còn ACTIVE.' };
    }
    if (
      !form.sku.trim() ||
      form.sku.trim().length > 100 ||
      form.name.length > 255 ||
      form.slug.length > 200 ||
      !form.sellingPrice.trim() ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      (cost !== null && (!Number.isSafeInteger(cost) || cost < 0))
    ) {
      return {
        payload: null,
        message: 'Kiểm tra SKU (bắt buộc, tối đa 100 ký tự), tên/slug và giá VND nguyên không âm.',
      };
    }

    const attributeResult = buildProductAttributeInputs(
      adminMeta.attributes,
      attributeDraft,
      form.status,
    );
    if (attributeResult.errors.length > 0) {
      return { payload: null, message: attributeResult.errors.join(' ') };
    }

    return {
      payload: {
        sku: form.sku.trim(),
        name: form.name.trim() || null,
        slug: form.slug.trim() || null,
        description: form.description.trim() || null,
        parent_product_id: parent,
        category_id: category,
        brand_id: brand,
        selling_price: price,
        cost_price: cost,
        status: form.status,
        attribute_values: attributeResult.values,
      },
      message: null,
    };
  };

  const finishCreate = (productId: number) => {
    setForm(initialForm);
    setAttributeDraft(attributeDraftFromValues(adminMeta?.attributes ?? [], []));
    setImages([]);
    setShowCreate(false);
    setPendingProductId(null);
    setLastCreatedId(productId);
    setError(null);
    list.reload();
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || submitting) return;
    const validation =
      pendingProductId === null
        ? buildCreatePayload()
        : { payload: null, message: null };
    if (pendingProductId === null && !validation.payload) {
      setError(validation.message ?? 'Dữ liệu Product chưa hợp lệ.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let created: AdminProductDetailDto;
      if (pendingProductId !== null) {
        created = await adminProductService.getProduct(pendingProductId);
      } else if (validation.payload) {
        created = await adminProductService.createProduct(validation.payload);
      } else {
        return;
      }

      if (images.length > 0) {
        try {
          await adminProductService.uploadImages(created.product_id, images);
        } catch (uploadError: unknown) {
          setPendingProductId(created.product_id);
          setLastCreatedId(created.product_id);
          setError(
            getApiErrorMessage(
              uploadError,
              'Product đã tạo nhưng tải ảnh thất bại. Chọn lại ảnh rồi thử lại.',
            ),
          );
          list.reload();
          showToast('Product đã tạo; tải ảnh thất bại. Có thể thử lại mà không tạo trùng Product.');
          return;
        }
      }
      finishCreate(created.product_id);
      showToast('Đã tạo Product ' + created.sku + '.');
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(requestError, 'Không thể tạo Product. Kiểm tra quyền và dữ liệu catalog.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const parent = optionalId(parentFilterInput);
    if (parent === undefined) {
      setError('Bộ lọc Product cha phải là số nguyên dương.');
      return;
    }
    setPage(1);
    setQuery(queryInput.trim());
    setParentFilter(parent ?? '');
    setError(null);
  };

  const cancelCreate = () => {
    if (!canDiscard()) return;
    setShowCreate(false);
    setPendingProductId(null);
    setForm(initialForm);
    setAttributeDraft(attributeDraftFromValues(adminMeta?.attributes ?? [], []));
    setImages([]);
    setError(null);
  };

  const openProduct = (id: number, edit = false) => {
    const callback = edit ? onEditProduct ?? onSelectProduct : onSelectProduct ?? onEditProduct;
    if (callback) callback(String(id));
    else onNavigateTab?.('product-detail', 'Chi tiết Product #' + id);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Sản phẩm</h1>
          <p className="mt-1 text-sm text-[#606863]">
            Quản lý Product theo contract hiện tại; Product cha và Product con có SKU, giá riêng.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="admin-primary"
          >
            {showCreate ? 'Đóng form' : 'Thêm Product'}
          </button>
        )}
      </header>

      {error && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {metaError && (
        <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {metaError}
          <button
            type="button"
            className="ml-2 font-semibold underline"
            disabled={metaLoading}
            onClick={() => setMetaRevision((value) => value + 1)}
          >
            Tải lại metadata
          </button>
        </div>
      )}

      {showCreate && canWrite && (
        <form
          onSubmit={create}
          className="space-y-4 rounded-xl border border-[#E2E5DE] bg-white p-5"
        >
          <h2 className="font-serif text-xl font-bold">Thông tin Product mới</h2>
          {metaLoading && (
            <p role="status" className="text-sm text-[#606863]">
              Đang tải metadata Attribute, Category và Brand...
            </p>
          )}
          <fieldset
            disabled={metaLoading || submitting || pendingProductId !== null}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">SKU *</span>
                <input
                  required
                  maxLength={100}
                  value={form.sku}
                  onChange={(event) => updateForm('sku', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Tên Product</span>
                <input
                  maxLength={255}
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Slug</span>
                <input
                  maxLength={200}
                  value={form.slug}
                  onChange={(event) => updateForm('slug', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Product cha ID (tùy chọn)</span>
                <input
                  aria-label="Product cha ID"
                  type="number"
                  min="1"
                  step="1"
                  value={form.parentProductId}
                  onChange={(event) => updateForm('parentProductId', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2"
                />
                <span className="block text-xs text-[#606863]">
                  Để trống nếu Product độc lập. Backend xác thực quan hệ cha/con một cấp.
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Danh mục</span>
                <select
                  aria-label="Danh mục Product"
                  value={form.categoryId}
                  onChange={(event) => updateForm('categoryId', event.target.value)}
                  className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
                >
                  <option value="">Không chọn danh mục</option>
                  {catalogMeta?.categories
                    .filter((item) => item.status === 'ACTIVE')
                    .map((item) => (
                      <option key={item.category_id} value={item.category_id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Thương hiệu</span>
                <select
                  aria-label="Thương hiệu Product"
                  value={form.brandId}
                  onChange={(event) => updateForm('brandId', event.target.value)}
                  className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
                >
                  <option value="">Không chọn thương hiệu</option>
                  {catalogMeta?.brands
                    .filter((item) => item.status === 'ACTIVE')
                    .map((item) => (
                      <option key={item.brand_id} value={item.brand_id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Giá bán (VND) *</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.sellingPrice}
                  onChange={(event) => updateForm('sellingPrice', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Giá vốn (VND, tùy chọn)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.costPrice}
                  onChange={(event) => updateForm('costPrice', event.target.value)}
                  className="w-full border border-[#D9DDD6] px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-semibold">Trạng thái Product</span>
                <select
                  aria-label="Trạng thái Product"
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value as ProductStatus)}
                  className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="block text-xs font-semibold">Mô tả</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2"
              />
            </label>
            <div className="space-y-3 rounded-lg border border-[#E2E5DE] p-4">
              <h3 className="font-semibold">Typed Attribute values</h3>
              <ProductAttributeFields
                attributes={adminMeta?.attributes ?? []}
                draft={attributeDraft}
                status={form.status}
                onChange={(attributeId, value) =>
                  setAttributeDraft((current) => ({
                    ...current,
                    [String(attributeId)]: value,
                  }))
                }
              />
            </div>
          </fieldset>
          <div className="border border-dashed border-[#D9DDD6] bg-[#F8FAF4] p-3">
            <label className="block space-y-2 text-sm">
              <span className="text-xs font-semibold">Ảnh Product (tùy chọn)</span>
              <input
                aria-label="Ảnh Product mới"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={metaLoading || submitting}
                onChange={(event) => setImages(Array.from(event.target.files ?? []))}
                className="block max-w-full text-xs"
              />
            </label>
            <ImageFilePreview files={images} />
          </div>
          {pendingProductId !== null && (
            <p role="status" className="text-sm text-amber-800">
              Product #{pendingProductId} đã được tạo. Chỉ còn bước tải ảnh; chọn lại ảnh nếu cần,
              không tạo lại Product.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting || metaLoading || !adminMeta || !catalogMeta}
              className="admin-primary disabled:opacity-40"
            >
              {submitting ? 'Đang lưu...' : pendingProductId !== null ? 'Thử tải ảnh lại' : 'Tạo Product'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={cancelCreate}
              className="admin-secondary"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      <form
        onSubmit={requestSearch}
        className="flex flex-wrap gap-2 rounded-xl border border-[#E2E5DE] bg-white p-3"
      >
        <input
          aria-label="Tìm sản phẩm"
          placeholder="Tìm theo tên hoặc SKU"
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          className="min-w-48 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm"
        />
        <select
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProductStatus | '');
            setPage(1);
          }}
          className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <select
          aria-label="Lọc danh mục"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
          className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả danh mục</option>
          {catalogMeta?.categories.map((item) => (
            <option key={item.category_id} value={item.category_id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc thương hiệu"
          value={brandId}
          onChange={(event) => {
            setBrandId(event.target.value);
            setPage(1);
          }}
          className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả thương hiệu</option>
          {catalogMeta?.brands.map((item) => (
            <option key={item.brand_id} value={item.brand_id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Lọc Product cha ID"
          type="number"
          min="1"
          step="1"
          placeholder="Product cha ID"
          value={parentFilterInput}
          onChange={(event) => setParentFilterInput(event.target.value)}
          className="w-36 border border-[#D9DDD6] px-3 py-2 text-sm"
        />
        <select
          aria-label="Kích thước trang"
          value={String(pageSize)}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm"
        >
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>
        <button type="submit" className="admin-secondary">
          Tìm kiếm
        </button>
      </form>

      <QueryFeedback
        loading={list.loading}
        error={list.error ? getApiErrorMessage(list.error, 'Không thể tải danh sách Product.') : null}
        onRetry={list.reload}
      />
      {!list.loading && !list.error && products.length === 0 && (
        <p className="admin-state">Không có Product phù hợp.</p>
      )}
      {products.length > 0 && (
        <AdminProductTable
          products={products}
          meta={catalogMeta}
          onOpen={(id) => openProduct(id)}
          onEdit={(id) => openProduct(id, true)}
        />
      )}
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            Trang {pagination.page} / {pagination.total_pages} · {pagination.total} Product
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={list.loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="admin-secondary"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={list.loading || page >= pagination.total_pages}
              onClick={() => setPage((current) => current + 1)}
              className="admin-secondary"
            >
              Sau
            </button>
          </div>
        </div>
      )}
      {lastCreatedId !== null && (
        <div className="flex items-center gap-3 border border-[#C8DDCC] bg-[#EEF6EE] p-3 text-sm">
          <span>Product #{lastCreatedId} đã được tạo.</span>
          <button
            type="button"
            onClick={() => openProduct(lastCreatedId, true)}
            className="font-bold underline"
          >
            Mở chi tiết
          </button>
        </div>
      )}
    </div>
  );
};
