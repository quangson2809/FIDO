import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { adminProductService } from '../../features/catalog/api/adminService';
import { catalogService } from '../../features/catalog/api/service';
import type {
  AdminProductDetailDto,
  AdminProductSummaryDto,
  CatalogMetaDto,
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
  gender: string;
  season: string;
  style: string;
  materialCare: string;
  saleStatus: 'ON_SALE' | 'STOPPED';
}

const initialForm: CreateFormState = {
  name: '',
  categoryId: '',
  brandId: '',
  sizeSystemId: '',
  basePrice: '',
  description: '',
  gender: '',
  season: '',
  style: '',
  materialCare: '',
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
  const [catalogMeta, setCatalogMeta] = useState<CatalogMetaDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
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

    void catalogService.getMeta()
      .then((meta) => {
        if (!active) return;
        setCatalogMeta(meta);
        setMetaError(null);
      })
      .catch(() => {
        if (active) {
          setMetaError('Không thể tải metadata catalog để tạo sản phẩm.');
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

  const leafCategories = useMemo(() => {
    if (!catalogMeta) return [];
    const parentIds = new Set(
      catalogMeta.categories
        .map((category) => category.parent_category_id)
        .filter((id): id is number => id !== null),
    );
    return catalogMeta.categories.filter(
      (category) => !parentIds.has(category.category_id),
    );
  }, [catalogMeta]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('vi-VN');
    if (!query) return products;
    return products.filter((product) =>
      product.name.toLocaleLowerCase('vi-VN').includes(query),
    );
  }, [products, searchTerm]);

  const categoryNames = useMemo(
    () => new Map(catalogMeta?.categories.map((category) => [category.category_id, category.name]) ?? []),
    [catalogMeta],
  );
  const brandNames = useMemo(
    () => new Map(catalogMeta?.brands.map((brand) => [brand.brand_id, brand.name]) ?? []),
    [catalogMeta],
  );

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
    const brandId = form.brandId ? Number(form.brandId) : undefined;

    if (
      !catalogMeta
      || !form.name.trim()
      || !Number.isInteger(categoryId)
      || !leafCategories.some((category) => category.category_id === categoryId)
      || !Number.isInteger(sizeSystemId)
      || !catalogMeta.size_systems.some((system) => system.size_system_id === sizeSystemId)
      || !Number.isFinite(basePrice)
      || basePrice < 0
      || (brandId !== undefined
        && !catalogMeta.brands.some((brand) => brand.brand_id === brandId))
    ) {
      return null;
    }

    return {
      category_id: categoryId,
      brand_id: brandId,
      size_system_id: sizeSystemId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      gender: form.gender || null,
      season: form.season || null,
      style: form.style || null,
      material_care: form.materialCare.trim() || null,
      base_price: basePrice,
      sale_status: form.saleStatus,
      variants: [],
    };
  };

  const finishCreate = async (
    created: AdminProductDetailDto,
    message: string,
  ) => {
    showToast(message);
    setForm(initialForm);
    setImageFiles([]);
    setShowCreateForm(false);
    await refreshProducts();
    const productId = String(created.product_id);
    setSelectedProductId(productId);
    onSelectProduct?.(productId);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = createPayload();
    if (!payload) {
      showToast('Vui lòng chọn metadata catalog hợp lệ và kiểm tra các trường bắt buộc.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await adminProductService.createProduct(payload);

      if (imageFiles.length === 0) {
        await finishCreate(created, `Đã tạo sản phẩm ${created.name}.`);
        return;
      }

      try {
        const withImages = await adminProductService.uploadProductImages(
          created.product_id,
          imageFiles,
        );
        await finishCreate(withImages, `Đã tạo sản phẩm ${withImages.name}.`);
      } catch {
        await finishCreate(
          created,
          `Đã tạo sản phẩm ${created.name}, nhưng tải ảnh thất bại. Hãy mở sản phẩm và tải ảnh lại.`,
        );
      }
    } catch {
      showToast('Không thể tạo sản phẩm. Kiểm tra phiên đăng nhập và quyền catalog.');
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

  const creationMetadataReady = Boolean(
    catalogMeta
    && leafCategories.length > 0
    && catalogMeta.size_systems.length > 0,
  );

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
            Tạo metadata sản phẩm trước, sau đó frontend tải file ảnh qua API multipart riêng;
            frontend không giữ khóa hoặc gọi trực tiếp nhà cung cấp lưu trữ ảnh.
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
          {metaError && (
            <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {metaError} Form tạo mới bị khóa để tránh gửi ID tự đoán.
            </div>
          )}
          {!catalogMeta && !metaError && (
            <div className="border border-[#E8E9E3] bg-[#F8FAF7] p-3 text-sm text-[#687069]">
              Đang tải metadata catalog...
            </div>
          )}
          {catalogMeta && !creationMetadataReady && (
            <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Catalog chưa có đủ danh mục lá hoặc hệ size để tạo sản phẩm.
            </div>
          )}

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
              <span className="font-semibold">Danh mục lá *</span>
              <select
                value={form.categoryId}
                onChange={(event) => updateForm('categoryId', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
                required
              >
                <option value="">Chọn danh mục</option>
                {leafCategories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name} (#{category.category_id})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Hệ size *</span>
              <select
                value={form.sizeSystemId}
                onChange={(event) => updateForm('sizeSystemId', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
                required
              >
                <option value="">Chọn hệ size</option>
                {catalogMeta?.size_systems.map((system) => (
                  <option key={system.size_system_id} value={system.size_system_id}>
                    {system.name} ({system.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Thương hiệu</span>
              <select
                value={form.brandId}
                onChange={(event) => updateForm('brandId', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              >
                <option value="">Không gán thương hiệu</option>
                {catalogMeta?.brands.map((brand) => (
                  <option key={brand.brand_id} value={brand.brand_id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Giá cơ sở *</span>
              <input
                type="number"
                min="0"
                step="0.01"
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
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Giới tính</span>
              <select
                value={form.gender}
                onChange={(event) => updateForm('gender', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              >
                <option value="">Không chọn</option>
                {catalogMeta?.genders.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Mùa</span>
              <select
                value={form.season}
                onChange={(event) => updateForm('season', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              >
                <option value="">Không chọn</option>
                {catalogMeta?.seasons.map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold">Phong cách</span>
              <select
                value={form.style}
                onChange={(event) => updateForm('style', event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              >
                <option value="">Không chọn</option>
                {catalogMeta?.styles.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              <span className="font-semibold">Chất liệu &amp; bảo quản</span>
              <textarea
                value={form.materialCare}
                onChange={(event) => updateForm('materialCare', event.target.value)}
                rows={3}
                className="w-full border border-[#D9DDD6] px-3 py-2 outline-none focus:border-[#0B2419]"
              />
            </label>
          </div>

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
                ? `${imageFiles.length} file sẽ được tải sau khi backend tạo Product thành công.`
                : 'Không chọn file: sản phẩm được tạo không có ảnh.'}
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
              disabled={submitting || !creationMetadataReady}
              className="bg-[#0B2419] px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                    <td className="px-4 py-3">
                      {categoryNames.get(product.category_id) ?? `#${product.category_id}`}
                    </td>
                    <td className="px-4 py-3">
                      {product.brand_id
                        ? brandNames.get(product.brand_id) ?? `#${product.brand_id}`
                        : '—'}
                    </td>
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
