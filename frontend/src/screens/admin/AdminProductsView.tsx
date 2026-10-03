import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { adminProductService } from '../../features/catalog/api/adminService';
import type {
  AdminProductSummaryDto,
  ProductCreateInput,
} from '../../features/catalog/types';
import { resolveImageUrl } from '../../services/media/imageUrl';

interface AdminProductsViewProps {
  onSelectProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
}

interface CreateFormState {
  name: string;
  categoryId: string;
  brandId: string;
  sizeSystemId: string;
  basePrice: string;
  description: string;
  saleStatus: 'ON_SALE' | 'STOPPED';
}

const initialForm: CreateFormState = {
  name: '',
  categoryId: '',
  brandId: '',
  sizeSystemId: '',
  basePrice: '',
  description: '',
  saleStatus: 'ON_SALE',
};

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({
  onSelectProduct,
  onEditProduct,
  onNavigateTab,
  showToast,
}) => {
  const { setSelectedProductId } = useApp();
  const [products, setProducts] = useState<AdminProductSummaryDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateFormState>(initialForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    let active = true;

    void adminProductService.getProducts()
      .then((response) => {
        if (!active) return;
        setProducts(response.data);
        setError(null);
      })
      .catch(() => {
        if (active) {
          setError('Không thể tải danh sách sản phẩm quản trị.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshProducts = async () => {
    setLoading(true);
    try {
      const response = await adminProductService.getProducts();
      setProducts(response.data);
      setError(null);
    } catch {
      setError('Không thể tải danh sách sản phẩm quản trị.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('vi-VN');
    if (!query) return products;
    return products.filter((product) =>
      product.name.toLocaleLowerCase('vi-VN').includes(query),
    );
  }, [products, searchTerm]);

  const updateForm = <K extends keyof CreateFormState>(
    key: K,
    value: CreateFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createPayload = (): ProductCreateInput | null => {
    const categoryId = Number(form.categoryId);
    const sizeSystemId = Number(form.sizeSystemId);
    const basePrice = Number(form.basePrice);
    const brandId = form.brandId.trim() ? Number(form.brandId) : undefined;

    if (
      !form.name.trim()
      || !Number.isInteger(categoryId)
      || categoryId <= 0
      || !Number.isInteger(sizeSystemId)
      || sizeSystemId <= 0
      || !Number.isFinite(basePrice)
      || basePrice < 0
      || (brandId !== undefined && (!Number.isInteger(brandId) || brandId <= 0))
    ) {
      return null;
    }

    return {
      category_id: categoryId,
      brand_id: brandId,
      size_system_id: sizeSystemId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      base_price: basePrice,
      sale_status: form.saleStatus,
      variants: [],
    };
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = createPayload();
    if (!payload) {
      showToast('Vui lòng kiểm tra tên, category, size system, brand và giá cơ sở.');
      return;
    }

    setSubmitting(true);
    try {
      const created = imageFiles.length > 0
        ? await adminProductService.createProductWithImages(payload, imageFiles)
        : await adminProductService.createProductJson(payload);

      showToast(`Đã tạo sản phẩm ${created.name}.`);
      setForm(initialForm);
      setImageFiles([]);
      setShowCreateForm(false);
      await refreshProducts();
      const productId = String(created.product_id);
      setSelectedProductId(productId);
      onSelectProduct?.(productId);
    } catch {
      showToast('Không thể tạo sản phẩm. Kiểm tra quyền truy cập và cấu hình ImgBB.');
    } finally {
      setSubmitting(false);
    }
  };

  const openProduct = (
    productId: number,
    callback: ((id: string) => void) | undefined,
  ) => {
    const id = String(productId);
    setSelectedProductId(id);
    callback?.(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">
            Sản phẩm &amp; Catalog
          </p>
          <h1 className="mt-1 font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">
            Quản lý sản phẩm
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#424844]">
            Danh sách dùng ảnh đại diện từ API. File ảnh tạo mới được gửi multipart về backend;
            backend upload ImgBB và lưu direct URL vào product_images.image_url.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('categories', 'Danh mục')}
              className="border border-[#D9DDD6] bg-white px-4 py-2 text-sm font-semibold"
            >
              Danh mục
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCreateForm((visible) => !visible)}
            className="bg-[#0B2419] px-5 py-2 text-sm font-bold uppercase tracking-wide text-white"
          >
            {showCreateForm ? 'Đóng form' : 'Thêm sản phẩm'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="space-y-4 border border-[#E8E9E3] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Tên sản phẩm *</span>
              <input
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Category ID *</span>
              <input
                inputMode="numeric"
                value={form.categoryId}
                onChange={(event) => updateForm('categoryId', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Size system ID *</span>
              <input
                inputMode="numeric"
                value={form.sizeSystemId}
                onChange={(event) => updateForm('sizeSystemId', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Brand ID</span>
              <input
                inputMode="numeric"
                value={form.brandId}
                onChange={(event) => updateForm('brandId', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Giá cơ sở *</span>
              <input
                type="number"
                min="0"
                value={form.basePrice}
                onChange={(event) => updateForm('basePrice', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Trạng thái *</span>
              <select
                value={form.saleStatus}
                onChange={(event) => updateForm(
                  'saleStatus',
                  event.target.value as CreateFormState['saleStatus'],
                )}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              >
                <option value="ON_SALE">ON_SALE</option>
                <option value="STOPPED">STOPPED</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Mô tả</span>
            <textarea
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              rows={3}
              className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold">Ảnh sản phẩm</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
              className="block w-full border border-dashed border-[#B8BEB9] bg-[#F8FAF7] p-4 text-sm"
            />
            <span className="block text-xs text-[#687069]">
              {imageFiles.length > 0
                ? `${imageFiles.length} file sẽ được upload qua backend lên ImgBB.`
                : 'Không chọn file: request JSON bình thường sẽ được sử dụng.'}
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="border border-[#D9DDD6] px-4 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#0B2419] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? 'Đang tạo...' : 'Tạo sản phẩm'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between gap-4 border border-[#E8E9E3] bg-white p-3">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm sản phẩm"
          className="w-full max-w-md border border-[#D9DDD6] px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
        />
        <span className="whitespace-nowrap text-sm text-[#687069]">
          {filteredProducts.length} sản phẩm
        </span>
      </div>

      {loading && <div className="py-12 text-center text-sm text-[#687069]">Đang tải...</div>}
      {!loading && error && (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto border border-[#E8E9E3] bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#F3F4EF] text-xs uppercase tracking-wide text-[#687069]">
              <tr>
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Giá</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {filteredProducts.map((product) => {
                const imageUrl = resolveImageUrl(product.image_url);
                return (
                  <tr key={product.product_id}>
                    <td className="px-4 py-3">
                      <div className="h-16 w-12 overflow-hidden bg-[#F3F4EF]">
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[10px] text-[#8A918B]">No image</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0B2419]">{product.name}</td>
                    <td className="px-4 py-3">#{product.category_id}</td>
                    <td className="px-4 py-3">{product.brand_id ? `#${product.brand_id}` : '—'}</td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {product.base_price.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-4 py-3">{product.sale_status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openProduct(product.product_id, onSelectProduct)}
                          className="border border-[#D9DDD6] px-3 py-1.5 text-xs font-semibold"
                        >
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => openProduct(product.product_id, onEditProduct)}
                          className="bg-[#0B2419] px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
