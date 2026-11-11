import { useRef, useState, type FormEvent } from 'react';
import type { AdminCatalogMetaDto, CatalogMetaDto, ProductStatus } from '../types';
import { adminProductService } from '../api/adminService';
import { ImageFilePreview } from './ImageFilePreview';
import { ProductAttributeFields } from './ProductAttributeFields';
import { ProductParentPicker } from './ProductParentPicker';
import { useDirtyForm } from '../../../shared/admin/dirtyFormContext';
import { getApiErrorMessage, normalizeApiError } from '../../../services/http/apiError';
import type { ProductAttributeDraft } from '../model/productAttributeForm';
import {
  buildProductCreate,
  emptyProductCreateForm,
  productCreateControlId,
  productCreateServerError,
  validateProductImageFiles,
  type ProductCreateErrors,
  type ProductCreateForm,
} from '../model/productCreateForm';

type Phase = 'idle' | 'creating' | 'uploading' | 'upload_failed' | 'create_unconfirmed';
const statuses: Record<ProductStatus, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  ARCHIVED: 'Lưu trữ',
};

export function AdminProductCreateForm({
  catalogMeta,
  adminMeta,
  metaLoading,
  metaError,
  initialParentId,
  onReloadMeta,
  onClose,
  onSaved,
  onOpen,
  onFindSku,
  showToast,
}: {
  catalogMeta: CatalogMetaDto | null;
  adminMeta: AdminCatalogMetaDto | null;
  metaLoading: boolean;
  metaError: string | null;
  initialParentId?: number | null;
  onReloadMeta: () => void;
  onClose: () => void;
  onSaved: (id: number) => void;
  onOpen: (id: number) => void;
  onFindSku: (sku: string) => void;
  showToast: (message: string) => void;
}) {
  const [initial, setInitial] = useState(() => ({
    ...emptyProductCreateForm,
    parentProductId: initialParentId ? String(initialParentId) : '',
  }));
  const [form, setForm] = useState<ProductCreateForm>(initial);
  const [draft, setDraft] = useState<ProductAttributeDraft>({});
  const [images, setImages] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<ProductCreateErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState({ categoryId: false, brandId: false, parentProductId: false });
  const inFlight = useRef(false);
  const createAnother = useRef(false);
  const busy = phase === 'creating' || phase === 'uploading';
  const locked = busy || pendingId !== null || phase === 'create_unconfirmed';
  const canDiscard = useDirtyForm(
    pendingId === null &&
      (JSON.stringify(form) !== JSON.stringify(initial) ||
        Object.values(draft).some(Boolean) ||
        images.length > 0),
  );
  const limits = adminMeta?.image_upload;
  const fileError = validateProductImageFiles(images, limits);

  const updateImages = (next: File[] | ((current: File[]) => File[])) => {
    setImages(next);
    setErrors((current) => {
      const remaining = { ...current };
      delete remaining.images;
      return remaining;
    });
  };
  const field = <K extends keyof ProductCreateForm>(key: K, value: ProductCreateForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const publishErrors = (next: ProductCreateErrors) => {
    setErrors(next);
    requestAnimationFrame(() => {
      const control = document.getElementById(productCreateControlId(Object.keys(next)[0] ?? ''));
      // Controls in a collapsed advanced section must become visible before focus.
      const section = control?.closest('details');
      if (section) section.open = true;
      control?.focus();
    });
  };
  const finish = (id: number, close = false) => {
    onSaved(id);
    setPendingId(null);
    setPhase('idle');
    setImages([]);
    setDraft({});
    setErrors({});
    setError(null);
    if (createAnother.current && !close) {
      const next = {
        ...emptyProductCreateForm,
        categoryId: keep.categoryId ? form.categoryId : '',
        brandId: keep.brandId ? form.brandId : '',
        parentProductId: keep.parentProductId ? form.parentProductId : '',
      };
      setInitial(next);
      setForm(next);
      requestAnimationFrame(() => document.getElementById(productCreateControlId('sku'))?.focus());
    } else onClose();
  };
  const close = () => {
    if (busy) return;
    if (pendingId !== null) {
      const id = pendingId;
      finish(id, true);
      showToast('Product #' + id + ' đã được lưu. Đóng form không xóa Product.');
    } else if (canDiscard()) onClose();
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || busy || phase === 'create_unconfirmed') return;
    const checked =
      pendingId === null ? buildProductCreate(form, draft, catalogMeta, adminMeta) : null;
    const validation = { ...checked?.errors };
    if (fileError) validation.images = fileError;
    if (pendingId !== null && !images.length)
      validation.images = 'Chọn ảnh để thử tải lại hoặc hoàn tất không ảnh.';
    if (Object.keys(validation).length) {
      publishErrors(validation);
      return;
    }
    inFlight.current = true;
    setError(null);
    setErrors({});
    setPhase(pendingId === null ? 'creating' : 'uploading');
    let id = pendingId;
    try {
      if (id === null && checked?.payload) {
        const created = await adminProductService.createProduct(checked.payload);
        id = created.product_id;
        setPendingId(id);
      }
      if (id === null) {
        setPhase('idle');
        return;
      }
      if (images.length) {
        setPhase('uploading');
        try {
          await adminProductService.uploadImages(id, images);
        } catch (failure: unknown) {
          setPhase('upload_failed');
          onSaved(id);
          setError(getApiErrorMessage(failure, 'Chưa xác nhận được kết quả tải ảnh.'));
          showToast('Product #' + id + ' đã tạo; chưa hoàn tất xác nhận tải ảnh.');
          return;
        }
      }
      finish(id);
      showToast('Đã hoàn tất Product #' + id + '.');
    } catch (failure: unknown) {
      const apiError = normalizeApiError(failure);
      const fieldError = productCreateServerError(apiError.code);
      if (fieldError) publishErrors({ [fieldError[0]]: fieldError[1] });
      else setError(getApiErrorMessage(failure, 'Không thể tạo sản phẩm.'));
      setPhase(
        apiError.status === undefined || apiError.status >= 500 ? 'create_unconfirmed' : 'idle',
      );
    } finally {
      inFlight.current = false;
    }
  };
  const describe = (key: string) => ({
    id: productCreateControlId(key),
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? productCreateControlId(key) + '-error' : undefined,
  });
  const fieldError = (key: string) =>
    errors[key] ? (
      <span id={productCreateControlId(key) + '-error'} className="block text-xs text-red-700">
        {errors[key]}
      </span>
    ) : null;
  const textField = (
    key: 'sku' | 'name' | 'slug' | 'sellingPrice' | 'costPrice',
    label: string,
    maxLength?: number,
  ) => (
    <label className="block min-w-0 space-y-1 text-sm">
      <span className="block text-xs font-semibold">{label}</span>
      <input
        {...describe(key)}
        value={form[key]}
        maxLength={maxLength}
        type={key === 'sellingPrice' || key === 'costPrice' ? 'number' : 'text'}
        min={key === 'sellingPrice' || key === 'costPrice' ? 0 : undefined}
        step={key === 'sellingPrice' || key === 'costPrice' ? 1 : undefined}
        required={key === 'sku' || key === 'sellingPrice'}
        onChange={(event) => field(key, event.target.value)}
        className="w-full border border-[#D9DDD6] px-3 py-2"
      />
      {fieldError(key)}
    </label>
  );

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label="Tạo sản phẩm mới"
      className="space-y-5 rounded-xl border border-[#E2E5DE] bg-white p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold">Thông tin Product mới</h2>
          <p className="text-sm text-[#606863]">
            Bắt đầu với SKU và giá bán. Lưu nháp để hoàn thiện sau.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={close} className="admin-secondary">
          {pendingId !== null ? 'Đóng form (Product đã lưu)' : 'Đóng form'}
        </button>
      </header>
      <ol aria-label="Tiến trình tạo sản phẩm" className="flex flex-wrap gap-4 text-xs">
        <li
          aria-current={
            pendingId === null && phase === 'idle'
              ? 'step'
              : undefined
          }
        >
          1. Nhập thông tin
        </li>
        <li aria-current={phase === 'creating' || phase === 'create_unconfirmed' ? 'step' : undefined}>
          2. Lưu sản phẩm{pendingId !== null ? ' ✓' : ''}
        </li>
        <li aria-current={phase === 'uploading' || phase === 'upload_failed' ? 'step' : undefined}>
          3. Tải ảnh (tùy chọn)
        </li>
      </ol>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-sm text-red-700">
          Kiểm tra các trường được đánh dấu. Dữ liệu đã nhập được giữ nguyên.
        </p>
      )}
      {phase === 'create_unconfirmed' && (
        <div
          role="alert"
          className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm"
        >
          <p>
            Chưa xác nhận được kết quả tạo sản phẩm. Kiểm tra SKU <strong>{form.sku}</strong> trước
            khi thử lại. Đóng form không xóa dữ liệu đã được lưu.
          </p>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => onFindSku(form.sku.trim())}
          >
            Kiểm tra sản phẩm theo SKU
          </button>{' '}
          <button
            type="button"
            className="admin-secondary"
            onClick={() => {
              setPhase('idle');
              setError(null);
            }}
          >
            Tôi đã kiểm tra, cho phép thử lại
          </button>
        </div>
      )}
      <fieldset disabled={locked} className="space-y-5">
        <section className="space-y-3" aria-label="Thông tin cơ bản">
          <h3 className="font-semibold">1. Thông tin cơ bản</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('sku', 'SKU *', 100)}
            {textField('name', 'Tên Product', 255)}
            {textField('sellingPrice', 'Giá bán (VND) *')}
            <label className="block space-y-1 text-sm">
              <span className="block text-xs font-semibold">Trạng thái Product</span>
              <select
                aria-label="Trạng thái Product"
                value={form.status}
                onChange={(event) => {
                  const status = Object.keys(statuses).find((key) => key === event.target.value);
                  if (
                    status === 'DRAFT' ||
                    status === 'ACTIVE' ||
                    status === 'INACTIVE' ||
                    status === 'ARCHIVED'
                  )
                    field('status', status);
                }}
                className="w-full border border-[#D9DDD6] bg-white px-3 py-2"
              >
                {Object.entries(statuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-[#606863]">
            Giá bán là số VND nguyên không âm; giá 0 được chấp nhận. Sản phẩm hoạt động phải có đủ
            thuộc tính bắt buộc; tồn kho được quản lý riêng.
          </p>
        </section>
        <section className="space-y-3" aria-label="Phân loại và quan hệ">
          <h3 className="font-semibold">2. Phân loại và quan hệ</h3>
          <ProductParentPicker
            value={form.parentProductId}
            onChange={(value) => field('parentProductId', value)}
            disabled={locked}
            error={errors.parentProductId}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Danh mục</span>
              <select
                {...describe('categoryId')}
                aria-label="Danh mục Product"
                disabled={metaLoading || !catalogMeta}
                value={form.categoryId}
                onChange={(event) => field('categoryId', event.target.value)}
                className="w-full border bg-white px-3 py-2"
              >
                <option value="">Không chọn danh mục</option>
                {form.categoryId &&
                  !catalogMeta?.categories.some(
                    (row) => String(row.category_id) === form.categoryId && row.status === 'ACTIVE',
                  ) && <option value={form.categoryId}>Danh mục đã chọn không còn khả dụng</option>}
                {catalogMeta?.categories
                  .filter((row) => row.status === 'ACTIVE')
                  .map((row) => (
                    <option key={row.category_id} value={row.category_id}>
                      {row.name}
                    </option>
                  ))}
              </select>
              {fieldError('categoryId')}
            </label>
            <label className="block space-y-1 text-sm">
              <span>Thương hiệu</span>
              <select
                {...describe('brandId')}
                aria-label="Thương hiệu Product"
                disabled={metaLoading || !catalogMeta}
                value={form.brandId}
                onChange={(event) => field('brandId', event.target.value)}
                className="w-full border bg-white px-3 py-2"
              >
                <option value="">Không chọn thương hiệu</option>
                {form.brandId &&
                  !catalogMeta?.brands.some(
                    (row) => String(row.brand_id) === form.brandId && row.status === 'ACTIVE',
                  ) && <option value={form.brandId}>Thương hiệu đã chọn không còn khả dụng</option>}
                {catalogMeta?.brands
                  .filter((row) => row.status === 'ACTIVE')
                  .map((row) => (
                    <option key={row.brand_id} value={row.brand_id}>
                      {row.name}
                    </option>
                  ))}
              </select>
              {fieldError('brandId')}
            </label>
          </div>
        </section>
        <section
          className="space-y-3 rounded-lg border border-[#E2E5DE] p-4"
          aria-label="Thuộc tính sản phẩm"
        >
          <h3 className="font-semibold">3. Thuộc tính sản phẩm</h3>
          {metaLoading && (
            <p role="status" className="text-sm">
              Đang tải thuộc tính và danh mục. Bạn vẫn có thể nhập thông tin cơ bản.
            </p>
          )}
          {metaError && (
            <p className="text-sm text-amber-800">
              Không thể xác nhận metadata mới. Lựa chọn đã nhập vẫn được giữ. Nháp không có thuộc
              tính, danh mục hoặc thương hiệu vẫn có thể lưu.
            </p>
          )}
          <button
            id={productCreateControlId('attributes')}
            type="button"
            disabled={metaLoading}
            className="text-xs underline"
            onClick={onReloadMeta}
          >
            Tải lại thuộc tính và danh mục
          </button>
          {fieldError('attributes')}
          <ProductAttributeFields
            attributes={adminMeta?.attributes ?? []}
            draft={draft}
            status={form.status}
            disabled={metaLoading || !adminMeta}
            errors={errors}
            onChange={(id, value) => {
              setDraft((current) => ({ ...current, [id]: value }));
              setErrors((current) => {
                const next = { ...current };
                delete next['attribute:' + id];
                return next;
              });
            }}
          />
          {Object.entries(draft)
            .filter(
              ([id, value]) => value && !adminMeta?.attributes.some((a) => String(a.id) === id),
            )
            .map(([id, value]) => (
              <p key={id} className="text-sm text-amber-800">
                Thuộc tính #{id}: lựa chọn #{value} chưa được tải.{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setDraft((current) => ({ ...current, [id]: '' }))}
                >
                  Bỏ lựa chọn #{id}
                </button>
              </p>
            ))}
        </section>
        <details className="space-y-3 rounded-lg border p-3">
          <summary className="cursor-pointer font-semibold">
            Thông tin bổ sung (slug, giá vốn, mô tả)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {textField('slug', 'Slug', 200)}
            {textField('costPrice', 'Giá vốn (VND, tùy chọn)')}
          </div>
          <label className="mt-3 block space-y-1 text-sm">
            <span>Mô tả</span>
            <textarea
              aria-label="Mô tả"
              rows={3}
              value={form.description}
              onChange={(event) => field('description', event.target.value)}
              className="w-full border px-3 py-2"
            />
          </label>
        </details>
      </fieldset>
      <section
        className="space-y-3 rounded-lg border border-dashed p-3"
        aria-label="Ảnh sản phẩm mới"
      >
        <h3 className="font-semibold">4. Ảnh sản phẩm (tùy chọn)</h3>
        <label className="block text-sm">
          <span>Thêm ảnh JPEG, PNG hoặc WebP</span>
          <input
            id={productCreateControlId('images')}
            aria-label="Ảnh Product mới"
            aria-invalid={Boolean(errors.images || fileError)}
            aria-describedby={
              errors.images || fileError ? productCreateControlId('images') + '-error' : undefined
            }
            type="file"
            multiple
            accept={(limits?.content_types ?? ['image/jpeg', 'image/png', 'image/webp']).join(',')}
            disabled={busy || phase === 'create_unconfirmed'}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              updateImages((current) => [...current, ...selected]);
              event.target.value = '';
            }}
            className="mt-2 block max-w-full text-xs"
          />
        </label>
        {limits && (
          <p className="text-xs text-[#606863]">
            Tối đa {limits.max_files} ảnh/lần,{' '}
            {(limits.max_file_bytes / 1024 / 1024).toLocaleString('vi-VN')} MB/ảnh. Ảnh đầu tiên là
            ảnh chính khi tạo mới.
          </p>
        )}
        {(errors.images || fileError) && (
          <p
            id={productCreateControlId('images') + '-error'}
            role="alert"
            className="text-sm text-red-700"
          >
            {fileError ?? errors.images}
          </p>
        )}
        <ImageFilePreview
          files={images}
          disabled={busy || phase === 'create_unconfirmed'}
          onChange={updateImages}
          primaryFirst
        />
        {images.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => updateImages([])}
            className="text-xs underline"
          >
            Bỏ tất cả ảnh
          </button>
        )}
      </section>
      {pendingId !== null && (
        <div
          role="status"
          className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p>Product #{pendingId} đã được tạo và tồn tại trong hệ thống.</p>
          <p>
            {phase === 'uploading'
              ? 'Đang tải ảnh...'
              : 'Chỉ còn bước tải ảnh. Nếu mất kết nối, hãy mở sản phẩm để kiểm tra gallery trước khi thử lại. Đóng form không xóa Product.'}
          </p>
        </div>
      )}
      {pendingId === null && (
        <div className="space-y-2 text-xs">
          <p>
            Khi “Lưu và tạo tiếp”, chỉ giữ những trường bạn chọn dưới đây. SKU, giá, thuộc tính và
            ảnh luôn được nhập mới; trạng thái trở về bản nháp.
          </p>
          <div className="flex flex-wrap gap-4">
            {(['categoryId', 'brandId', 'parentProductId'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={busy || phase === 'create_unconfirmed'}
                  checked={keep[key]}
                  onChange={(event) =>
                    setKeep((current) => ({ ...current, [key]: event.target.checked }))
                  }
                />
                {
                  {
                    categoryId: 'Giữ danh mục',
                    brandId: 'Giữ thương hiệu',
                    parentProductId: 'Giữ sản phẩm cha',
                  }[key]
                }
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <button
          type="submit"
          disabled={
            busy || phase === 'create_unconfirmed' || (pendingId !== null && !images.length)
          }
          className="admin-primary"
          onClick={() => {
            if (pendingId === null) createAnother.current = false;
          }}
        >
          {phase === 'creating'
            ? 'Đang tạo Product...'
            : phase === 'uploading'
              ? 'Đang tải ảnh...'
              : pendingId !== null
                ? 'Thử tải ảnh lại'
                : form.status === 'DRAFT'
                  ? 'Lưu nháp'
                  : 'Tạo Product'}
        </button>
        {pendingId === null && (
          <button
            type="submit"
            disabled={busy || phase === 'create_unconfirmed'}
            className="admin-secondary"
            onClick={() => {
              createAnother.current = true;
            }}
          >
            Lưu và tạo tiếp
          </button>
        )}
        <button type="button" disabled={busy} onClick={close} className="admin-secondary">
          {pendingId !== null ? 'Hoàn tất, không tải thêm ảnh' : 'Hủy'}
        </button>
        {pendingId !== null && (
          <button
            type="button"
            disabled={busy}
            className="admin-secondary"
            onClick={() => {
              const id = pendingId;
              finish(id, true);
              onOpen(id);
            }}
          >
            Mở Product đã tạo
          </button>
        )}
      </div>
    </form>
  );
}
