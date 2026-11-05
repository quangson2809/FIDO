import React, { useCallback, useEffect, useState } from 'react';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { catalogService } from '../../features/catalog/api/service';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import { AdminProductTable } from '../../features/catalog/components/AdminProductTable';
import { AdminProductCreateForm } from '../../features/catalog/components/AdminProductCreateForm';
import type {
  AdminCatalogMetaDto,
  CatalogMetaDto,
  ProductStatus,
} from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface AdminProductsViewProps {
  onSelectProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
  initialParentId?: number | null;
}

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
  initialParentId,
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
  const [showCreate, setShowCreate] = useState(Boolean(initialParentId));
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);

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

  const openProduct = (id: number, edit = false) => {
    const callback = edit ? (onEditProduct ?? onSelectProduct) : (onSelectProduct ?? onEditProduct);
    if (callback) callback(String(id));
    else onNavigateTab?.('product-detail', 'Chi tiết Product #' + id);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">Sản phẩm</h1>
          <p className="mt-1 text-sm text-[#606863]">
            Quản lý sản phẩm độc lập và sản phẩm con, mỗi sản phẩm có SKU, giá và ảnh riêng.
          </p>
        </div>
        {canWrite && !showCreate && (
          <button type="button" onClick={() => setShowCreate(true)} className="admin-primary">
            Thêm Product
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
        <AdminProductCreateForm
          catalogMeta={catalogMeta}
          adminMeta={adminMeta}
          metaLoading={metaLoading}
          metaError={metaError}
          initialParentId={initialParentId}
          onReloadMeta={() => setMetaRevision((value) => value + 1)}
          onClose={() => setShowCreate(false)}
          onSaved={(id) => {
            setLastCreatedId(id);
            list.reload();
          }}
          onOpen={(id) => openProduct(id)}
          onFindSku={(sku) => {
            setQueryInput(sku);
            setQuery(sku);
            setCategoryId('');
            setBrandId('');
            setParentFilter('');
            setParentFilterInput('');
            setStatus('');
            setPage(1);
            list.reload();
          }}
          showToast={showToast}
        />
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
        error={
          list.error ? getApiErrorMessage(list.error, 'Không thể tải danh sách Product.') : null
        }
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
