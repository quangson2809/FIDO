<<<<<<< HEAD
import React, { useState } from 'react';
=======
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
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7

export const AdminProductsView: React.FC<{
  onSelectProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
<<<<<<< HEAD
  showToast: (msg: string) => void;
}> = ({ onSelectProduct, onEditProduct, onNavigateTab, showToast }) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('PRD-00102');
  const [showDrawer, setShowDrawer] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('Quần Jean');
  const [activeSubTab, setActiveSubTab] = useState<string>('all');

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Context Breadcrumb & Workspace Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 font-body-md text-sm text-[#424844]">
          <span className="text-[#687069]">Hệ thống Quản trị</span>
          <span className="material-symbols-outlined text-[16px] text-[#687069]">chevron_right</span>
          <span className="text-[#687069]">Sản phẩm &amp; Catalog</span>
          <span className="material-symbols-outlined text-[16px] text-[#687069]">chevron_right</span>
          <span className="text-[#0B2419] font-semibold">Quản lý sản phẩm</span>
=======
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
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
              Quản Lý Sản Phẩm &amp; Danh Mục Catalog
            </h1>
            <p className="text-sm text-[#424844] max-w-4xl">
              Quản lý 48 dòng Sản Phẩm Nam May Sẵn (Ready-to-Wear) cao cấp, ma trận biến thể SKUs, giá cơ sở, tồn kho thực tế xuất bán ngay theo kích cỡ &amp; màu sắc và kiểm soát trạng thái mở bán thời gian thực.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => showToast('Đang xuất toàn bộ catalog 48 sản phẩm ra tệp Excel/CSV...')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#0B2419] hover:bg-[#e7e9e3] transition-colors text-sm font-medium shadow-sm border border-[#E8E9E3]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#687069]">download</span>
              <span>Xuất Dữ Liệu Excel / CSV</span>
            </button>
            <button
              onClick={() => {
                if (onEditProduct) {
                  onEditProduct('new');
                } else {
                  showToast('Mở form tạo dòng sản phẩm Ready-to-Wear mới');
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B2419] text-white hover:bg-[#1B5038] transition-colors text-sm font-semibold tracking-wide uppercase shadow-md"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Thêm Sản Phẩm Mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-[#E8E9E3]">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-[#0B2419]/5 rounded-full blur-xl group-hover:bg-[#0B2419]/10 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">Tổng Sản Phẩm Catalog</span>
            <span className="w-8 h-8 rounded bg-[#0B2419]/5 text-[#0B2419] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-['Playfair_Display',serif] text-3xl text-[#0B2419] font-bold">48</span>
            <span className="text-[#1B5038] text-[13px] font-medium">dòng thời trang</span>
          </div>
          <div className="mt-2 flex items-center gap-2 pt-2 border-t border-[#E8E9E3]/50 text-[12px] text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>45 Đang Mở Bán (ON_SALE) · 3 Bản Nháp</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-[#E8E9E3]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">SKUs Biến Thể Hoạt Động</span>
            <span className="w-8 h-8 rounded bg-[#123A29]/10 text-[#123A29] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">dataset</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-['Playfair_Display',serif] text-3xl text-[#0B2419] font-bold">142</span>
            <span className="text-[#424844] text-[13px]">SKUs Biến Thể</span>
          </div>
          <div className="mt-2 flex items-center gap-2 pt-2 border-t border-[#E8E9E3]/50 text-[12px] text-[#687069]">
            <span className="text-[#1B5038] font-medium">Tổ hợp đa màu &amp; đa kích cỡ</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-[#E8E9E3]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">Giá Trị Catalog Niêm Yết</span>
            <span className="w-8 h-8 rounded bg-[#E8C75B]/20 text-[#725c00] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-['Playfair_Display',serif] text-3xl text-[#0B2419] font-bold">4.82 tỷ</span>
            <span className="text-[#424844] text-[13px]">VND quy đổi kho</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-[#E8E9E3]/50 text-[12px] text-[#687069]">
            <span className="text-[#725c00] font-medium">Giá bình quân: 2.150.000₫/sản phẩm</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border border-[#E8E9E3]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">Đồng Bộ Storefront</span>
            <span className="w-8 h-8 rounded bg-[#0B2419]/5 text-[#0B2419] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">sync_saved_locally</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-['Playfair_Display',serif] text-3xl text-[#0B2419] font-bold">100%</span>
            <span className="text-[#1B5038] text-[13px] font-medium">Đồng Bộ Chuẩn</span>
          </div>
          <div className="mt-2 flex items-center justify-between pt-2 border-t border-[#E8E9E3]/50 text-[12px] text-[#687069]">
            <span>Cập nhật trực tiếp</span>
            <span className="text-[#1B5038] font-medium font-mono">Thời gian thực</span>
          </div>
        </div>
      </div>

      {/* Catalog Sub-tabs Navigation */}
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#f3f4ef] p-1.5 rounded-lg border border-[#E8E9E3]">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded font-semibold text-[13px] transition-colors shadow-sm ${
              activeSubTab === 'all'
                ? 'bg-[#0B2419] text-white'
                : 'text-[#424844] hover:text-[#0B2419] hover:bg-white'
            }`}
            type="button"
          >
            <span className="w-2 h-2 rounded-full bg-[#E8C75B]"></span>
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            <span>Tất Cả Sản Phẩm (Active)</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold">48</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('he-size', 'Hệ size');
              } else {
                setActiveSubTab('sizes');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded text-[13px] transition-colors font-medium text-[#424844] hover:text-[#0B2419] hover:bg-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#687069]">straighten</span>
            <span>Hệ Thống Kích Cỡ</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('mau-sac', 'Màu sắc');
              } else {
                setActiveSubTab('colors');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded text-[13px] transition-colors font-medium text-[#424844] hover:text-[#0B2419] hover:bg-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#687069]">palette</span>
            <span>Bảng Màu Sắc</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('danh-muc', 'Danh mục');
              } else {
                setActiveSubTab('categories');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded text-[13px] transition-colors font-medium text-[#424844] hover:text-[#0B2419] hover:bg-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#687069]">account_tree</span>
            <span>Danh Mục Sản Phẩm</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('thuong-hieu', 'Thương hiệu');
              } else {
                setActiveSubTab('mills');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded text-[13px] transition-colors font-medium text-[#424844] hover:text-[#0B2419] hover:bg-white"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#687069]">workspace_premium</span>
            <span>Thương Hiệu &amp; Xưởng Dệt</span>
          </button>
        </div>
      </div>

      {/* Product Filter Bar */}
      <div className="bg-white p-3.5 shadow-sm border border-[#E8E9E3] flex flex-col xl:flex-row items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687069] text-[18px]">
            search
          </span>
          <input
            className="w-full h-10 bg-[#f3f4ef] border border-[#E8E9E3] pl-10 pr-4 rounded text-xs placeholder:text-[#687069] text-[#191c19] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0B2419] transition-all"
            placeholder="Tìm kiếm theo tên sản phẩm, mã SKU (#PRD), barcode..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown Filters Group */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full xl:w-auto text-xs">
          <select className="h-10 bg-[#f3f4ef] border border-[#E8E9E3] px-3 rounded text-[#191c19] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0B2419] cursor-pointer">
            <option value="">Tất cả Danh Mục</option>
            <option value="denim">Quần Jeans Selvedge</option>
            <option value="shirt">Áo Sơ Mi Linen / Supima</option>
            <option value="leather">Giày Boots Da Thủ Công</option>
            <option value="blazer">Áo Khoác Sartorial Blazer</option>
          </select>

          <select className="h-10 bg-[#f3f4ef] border border-[#E8E9E3] px-3 rounded text-[#191c19] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0B2419] cursor-pointer">
            <option value="">Tất cả Thương Hiệu / Mills</option>
            <option value="atelier">Atelier Vert Ready-to-Wear</option>
            <option value="kurabo">Kurabo Mills Japan</option>
            <option value="loropiana">Loro Piana Italy</option>
            <option value="albini">Albini Group</option>
          </select>

<<<<<<< HEAD
          <select className="h-10 bg-[#f3f4ef] border border-[#E8E9E3] px-3 rounded text-[#191c19] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0B2419] cursor-pointer">
            <option value="">Hệ Size (All)</option>
            <option value="jeans">Jeans Waist (Inch 28-36)</option>
            <option value="alpha">Tops Alpha (XS - XXL)</option>
            <option value="shoes">Footwear (EU 39-44)</option>
          </select>
=======
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
>>>>>>> fa78b77c4f9ff77546b2e352c6671bb30402c1d7

          <select className="h-10 bg-[#f3f4ef] border border-[#E8E9E3] px-3 rounded text-[#191c19] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0B2419] cursor-pointer">
            <option value="">Trạng thái</option>
            <option value="ON_SALE">Đang Mở Bán (ON_SALE)</option>
            <option value="LOW_STOCK">Sắp Hết Hàng</option>
            <option value="DRAFT">Bản Nháp (DRAFT)</option>
            <option value="ARCHIVED">Lưu Trữ (Archived)</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              showToast('Đã đặt lại bộ lọc sản phẩm');
            }}
            className="h-10 px-3 bg-[#f3f4ef] hover:bg-[#edeee9] border border-[#E8E9E3] rounded inline-flex items-center gap-1.5 text-[#424844] hover:text-[#0B2419] transition-colors flex-shrink-0"
            title="Đặt lại bộ lọc"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
            <span className="text-[12px] font-medium hidden sm:inline">Xóa lọc</span>
          </button>
        </div>
      </div>

      {/* Main Product Data Table */}
      <div className="bg-white shadow-sm overflow-hidden border border-[#E8E9E3]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f3f4ef]/70 text-[#191c19] text-[11px] uppercase tracking-wider border-b border-[#E8E9E3] font-bold">
                <th className="py-3.5 px-4 w-10">
                  <input className="accent-[#0B2419] w-4 h-4 cursor-pointer" type="checkbox" />
                </th>
                <th className="py-3.5 px-4">Sản Phẩm &amp; Mã ID</th>
                <th className="py-3.5 px-4">Danh Mục / Xưởng Vải</th>
                <th className="py-3.5 px-4">Hệ Size Áp Dụng</th>
                <th className="py-3.5 px-4">Ma Trận Biến Thể &amp; Tồn Kho</th>
                <th className="py-3.5 px-4">Giá Niêm Yết &amp; Ghi Đè</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {/* Row 1: Active Jeans */}
              <tr className="bg-[#FFFDF5]/80 transition-colors group border-l-4 border-l-[#0B2419]">
                <td className="py-4 px-4 align-top">
                  <input defaultChecked className="accent-[#0B2419] w-4 h-4 cursor-pointer mt-1" type="checkbox" />
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-20 bg-[#edeee9] flex-shrink-0 relative overflow-hidden border border-[#E8E9E3]">
                      <img
                        alt="Quần Jean Straight Fit Dark Indigo Selvedge"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfAxdArJcLa2lcaR9A16iev0aNRYdig4hYk_md_OzMAsEXUXXzCPQgotSCj-clRqNeS133rfXONEIB1K9Y4Z3IJ2nxJcTLxP4DxL0LqwexjkrW6w6U1Px7g3_BT-k2QbU9yoXhV5bCp_Av5NxVysOpct8DPMHG4I2NtJHmAXeG6dNd70CBNfcjJzePYfrsV3pMwHc-PfUX9t_IBAfS9uCOxNtWEzD283GyiAUz7mjGvPRnUSqiQWNn9A"
                      />
                      <span className="absolute top-1 left-1 px-1 py-0.2 bg-[#071A12]/80 text-white text-[9px] font-mono uppercase tracking-tighter">
                        Selvedge
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#0B2419]">
                          Quần Jean Straight Fit Dark Indigo Selvedge
                        </span>
                        <span className="px-1.5 py-0.2 bg-[#0B2419] text-white text-[10px] font-semibold uppercase">
                          Đang chọn
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[#687069] text-[12px] font-mono">
                        <span className="text-[#0B2419] font-medium">#PRD-00102</span>
                        <span>·</span>
                        <span>SKU Mẹ: KMD-ST-01</span>
                      </div>
                      <span className="text-[11px] text-[#687069] mt-0.5">Khởi tạo: 12/10/2024 bởi Lê Hoàng Quân</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="text-[#0B2419] font-medium">Quần Jean / Straight Fit</span>
                    <span className="text-[12px] text-[#687069] mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#E8C75B]">verified</span>
                      Kurabo Mills Japan (14oz)
                    </span>
                    <span className="text-[11px] text-[#687069] italic">Sợi chải kỹ Okayama</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-[#0B2419] text-[13px]">Jeans Waist (Inch)</span>
                    <div className="flex flex-wrap gap-1">
                      {['28', '29', '30', '31', '32', '34'].map((size) => (
                        <span key={size} className="px-1.5 py-0.5 bg-[#edeee9] text-[#0B2419] text-[11px] font-mono font-medium">
                          {size}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#687069]">6 Cỡ khả dụng</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-medium text-[#0B2419]">
                      <span className="font-semibold text-[#123A29]">18 SKUs Biến Thể</span>
                      <span className="text-[#687069] text-[12px]">(3 Màu x 6 Size)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-24 bg-[#edeee9] h-1.5 overflow-hidden rounded">
                        <div className="bg-[#1B5038] h-full w-[78%]"></div>
                      </div>
                      <span className="text-[12px] font-medium text-[#1B5038]">142 cái</span>
                    </div>
                    <div className="mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1B5038]/10 text-[#1B5038] text-[10px] font-semibold uppercase tracking-wider">
                        Tồn Kho An Toàn
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0B2419] font-mono text-[15px]">1.850.000 ₫</span>
                    <span className="text-[11px] text-[#687069] mt-0.5">Giá gốc cơ sở (Base)</span>
                    <span className="text-[11px] text-[#725c00] mt-1 bg-[#FAF4DF] px-1.5 py-0.5 w-fit font-mono">
                      Override: 2.150.000₫ (Size 34)
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1B5038]/10 text-[#1B5038] text-[11px] font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                      ON_SALE
                    </span>
                    <span className="text-[11px] text-[#687069]">Kênh Online &amp; Flagship</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        if (onEditProduct) {
                          onEditProduct('PRD-00102');
                        } else {
                          setSelectedProductId('PRD-00102');
                          setShowDrawer(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B2419] text-white hover:bg-[#1B5038] transition-colors text-[12px] font-semibold shadow-xs"
                      title="Xem Chi Tiết & Biến Thể"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Xem &amp; Sửa Biến Thể</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onEditProduct) {
                          onEditProduct('PRD-00102');
                        } else {
                          showToast('Mở trình sửa sản phẩm #PRD-00102');
                        }
                      }}
                      className="p-1.5 text-[#424844] hover:text-[#0B2419] hover:bg-[#edeee9] transition-colors"
                      title="Chỉnh sửa sản phẩm"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 2: Cuban Collar Shirt */}
              <tr className="hover:bg-[#FFFDF5]/50 transition-colors bg-white group">
                <td className="py-4 px-4 align-top">
                  <input className="accent-[#0B2419] w-4 h-4 cursor-pointer mt-1" type="checkbox" />
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-20 bg-[#edeee9] flex-shrink-0 relative overflow-hidden border border-[#E8E9E3]">
                      <img
                        alt="Áo Sơ Mi Cuban Collar Smoke Linen"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA64-nTS0xGZTFnnSNtm7O4iv0Fnx1X0RRcsKiTEZ39yAd_w12CQIWHTBT62yj88PzMQ9rS18WVAET9WP-o4qQ4Y8dsrOeekl0J3Wk7-cqkNPWpudwB-PiZSrlNwv2YilLk9H3n0oJxdfTy5TyIBhBau5iytqmyqvpUiSanGeiLBe567X85i0y7pw3uMHIP6_h19MKPdNZyCOKC0MhjmHxtZ9yQ7Y2SaHqtt9kVbQUNQKtRhnHq7UT3CQ"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-[#0B2419] group-hover:text-[#1B5038] transition-colors">
                        Áo Sơ Mi Cuban Collar Smoke Linen
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[#687069] text-[12px] font-mono">
                        <span className="text-[#0B2419] font-medium">#PRD-00098</span>
                        <span>·</span>
                        <span>SKU Mẹ: AL-CB-08</span>
                      </div>
                      <span className="text-[11px] text-[#687069] mt-0.5">Khởi tạo: 04/10/2024 bởi Admin Thu Hương</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="text-[#0B2419] font-medium">Áo / Sơ Mi Resort &amp; Linen</span>
                    <span className="text-[12px] text-[#687069] mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#E8C75B]">verified</span>
                      Albini Group Italy (100% Linen)
                    </span>
                    <span className="text-[11px] text-[#687069] italic">Sợi lanh Normandy dệt mịn</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-[#0B2419] text-[13px]">Standard Tops (Alpha)</span>
                    <div className="flex flex-wrap gap-1">
                      {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-[#edeee9] text-[#0B2419] text-[11px] font-mono font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#687069]">5 Cỡ khả dụng</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-medium text-[#0B2419]">
                      <span className="font-semibold text-[#123A29]">20 SKUs Biến Thể</span>
                      <span className="text-[#687069] text-[12px]">(4 Màu x 5 Size)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-24 bg-[#edeee9] h-1.5 overflow-hidden rounded">
                        <div className="bg-[#1B5038] h-full w-[64%]"></div>
                      </div>
                      <span className="text-[12px] font-medium text-[#1B5038]">89 cái</span>
                    </div>
                    <div className="mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1B5038]/10 text-[#1B5038] text-[10px] font-semibold uppercase tracking-wider">
                        Tồn Kho Đạt Chuẩn
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0B2419] font-mono text-[15px]">1.250.000 ₫</span>
                    <span className="text-[11px] text-[#687069] mt-0.5">Đồng giá toàn bộ size</span>
                    <span className="text-[11px] text-[#687069] mt-1 italic">Không có override</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1B5038]/10 text-[#1B5038] text-[11px] font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                      ON_SALE
                    </span>
                    <span className="text-[11px] text-[#687069]">Chạy chiến dịch Summer-Fall</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => showToast('Mở chi tiết Sơ Mi Cuban Linen')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B2419]/5 hover:bg-[#0B2419] hover:text-white transition-colors text-[12px] text-[#0B2419] font-semibold"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Xem &amp; Biến Thể</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 3: Chelsea Boots */}
              <tr className="hover:bg-[#FFFDF5]/50 transition-colors bg-white group">
                <td className="py-4 px-4 align-top">
                  <input className="accent-[#0B2419] w-4 h-4 cursor-pointer mt-1" type="checkbox" />
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-20 bg-[#edeee9] flex-shrink-0 relative overflow-hidden border border-[#E8E9E3]">
                      <img
                        alt="Chelsea Boots Da Bò Ý Mộc Nero"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeSQfF05nYJkPU4Hi5TEsBclxA9msqVCwGhJdpEQJdqgNQNLo7oN-b6xaAngpxjIcFd0jBVJcQsOjQVagCMUsfEjVSc5G-2pJFZzUT1ZQZObfEWLjqDtE0Hhl3u_XaXDdUyD16Q-RPmoqf09dZHxB0kuPYYSHibkt-7UXNKuzYknzQIM4iCvCOpfSPaTV_By1LIb0H8Z2kMHGzMFPAogsc6jX3ye5BJVe_Msn2dMzoNdBQtMO7T5UPvQ"
                      />
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-[#c7a840] text-[#4d3e00] text-[9px] font-mono uppercase font-bold">
                        Goodyear
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-[#0B2419] group-hover:text-[#1B5038] transition-colors">
                        Chelsea Boots Da Bò Ý Mộc Nero
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[#687069] text-[12px] font-mono">
                        <span className="text-[#0B2419] font-medium">#PRD-00085</span>
                        <span>·</span>
                        <span>SKU Mẹ: BT-NR-99</span>
                      </div>
                      <span className="text-[11px] text-[#687069] mt-0.5">Khởi tạo: 20/09/2024 bởi Lê Hoàng Quân</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="text-[#0B2419] font-medium">Giày &amp; Phụ Kiện / Boots Da</span>
                    <span className="text-[12px] text-[#687069] mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#E8C75B]">verified</span>
                      Atelier Vert Workshop (Firenze)
                    </span>
                    <span className="text-[11px] text-[#687069] italic">Da Veg-tan thuộc thảo mộc</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-[#0B2419] text-[13px]">Footwear (EU)</span>
                    <div className="flex flex-wrap gap-1">
                      {['39', '40', '41', '42', '43', '44'].map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-[#edeee9] text-[#0B2419] text-[11px] font-mono font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#687069]">6 Cỡ giày châu Âu</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-medium text-[#0B2419]">
                      <span className="font-semibold text-[#123A29]">12 SKUs Biến Thể</span>
                      <span className="text-[#687069] text-[12px]">(2 Màu x 6 Size)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-24 bg-[#edeee9] h-1.5 overflow-hidden rounded">
                        <div className="bg-[#725c00] h-full w-[22%]"></div>
                      </div>
                      <span className="text-[12px] font-medium text-[#725c00]">14 đôi</span>
                    </div>
                    <div className="mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#725c00]/15 text-[#725c00] text-[10px] font-semibold uppercase tracking-wider">
                        Cảnh Báo Tồn Thấp
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0B2419] font-mono text-[15px]">3.450.000 ₫</span>
                    <span className="text-[11px] text-[#687069] mt-0.5">Giá gốc cơ sở (Base)</span>
                    <span className="text-[11px] text-[#687069] mt-1 italic">Tặng kèm xi dưỡng Saphir</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1B5038]/10 text-[#1B5038] text-[11px] font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                      ON_SALE
                    </span>
                    <span className="text-[11px] text-[#725c00] font-medium">Cần bổ sung lô mới</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => showToast('Mở chi tiết Chelsea Boots da Ý')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B2419]/5 hover:bg-[#0B2419] hover:text-white transition-colors text-[12px] text-[#0B2419] font-semibold"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Xem &amp; Biến Thể</span>
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 4: Blazer Sartorial */}
              <tr className="hover:bg-[#FFFDF5]/50 transition-colors bg-white group">
                <td className="py-4 px-4 align-top">
                  <input className="accent-[#0B2419] w-4 h-4 cursor-pointer mt-1" type="checkbox" />
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-20 bg-[#edeee9] flex-shrink-0 relative overflow-hidden border border-[#E8E9E3]">
                      <img
                        alt="Áo Khoác Blazer May Đo Forest Green"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoCY3Vdsxx3UHbwEQRXNuSNP3PV73giXknc-axoOReehxY3IXVt9ImzWfuxWuKqwAc-N_zhcGO2UUN_RHssRWOqyvy_zc96TU7SIeXD1HckFeh3Xgkj-sTWR-D9-OlueOTv3CLwxf7NaYAzp5FL9w4GIQEBIw75sCvjvqGbpBKeqWovwX_iPtqhFh5-dqjn9xRisQ6GUwLgYDLB4WGsVv4Vn_CgwuAaITEZEAAa-h-p74EwGElaxW9Dg"
                      />
                      <span className="absolute top-1 left-1 px-1 py-0.2 bg-[#687069] text-white text-[9px] font-mono uppercase font-bold">
                        Draft
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-[#0B2419] group-hover:text-[#1B5038] transition-colors">
                        Áo Khoác Blazer May Sẵn RTW Forest Green
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[#687069] text-[12px] font-mono">
                        <span className="text-[#0B2419] font-medium">#PRD-00074</span>
                        <span>·</span>
                        <span>SKU Mẹ: LP-BZ-04</span>
                      </div>
                      <span className="text-[11px] text-[#687069] mt-0.5">Khởi tạo: 01/10/2024 bởi Quản lý Thiết kế</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="text-[#0B2419] font-medium">Áo / Blazer Ready-to-Wear Suit</span>
                    <span className="text-[12px] text-[#687069] mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-[#E8C75B]">verified</span>
                      Loro Piana Italy (Tasmanian Wool)
                    </span>
                    <span className="text-[11px] text-[#687069] italic">Vải len lông cừu Super 150s</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium text-[#0B2419] text-[13px]">Ready-to-Wear (IT/EU)</span>
                    <div className="flex flex-wrap gap-1">
                      {['46', '48', '50', '52', '54'].map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-[#edeee9] text-[#0B2419] text-[11px] font-mono font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-[#687069]">5 Cỡ phom âu</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 font-medium text-[#0B2419]">
                      <span className="font-semibold text-[#123A29]">10 SKUs Biến Thể</span>
                      <span className="text-[#687069] text-[12px]">(2 Màu x 5 Size)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-24 bg-[#edeee9] h-1.5 overflow-hidden rounded">
                        <div className="bg-[#687069] h-full w-[10%]"></div>
                      </div>
                      <span className="text-[12px] font-medium text-[#687069]">04 mẫu may</span>
                    </div>
                    <div className="mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#e7e9e3] text-[#687069] text-[10px] font-semibold uppercase tracking-wider">
                        Chờ Duyệt Mẫu Vải
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0B2419] font-mono text-[15px]">4.850.000 ₫</span>
                    <span className="text-[11px] text-[#687069] mt-0.5">Dự kiến niêm yết</span>
                    <span className="text-[11px] text-[#687069] mt-1 italic">Chưa công bố giá lẻ</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#e7e9e3] text-[#424844] text-[11px] font-semibold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#687069]"></span>
                      DRAFT
                    </span>
                    <span className="text-[11px] text-[#687069]">Chưa hiển thị trên web</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => showToast('Mở chi tiết Áo Khoác Blazer RTW')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#0B2419]/5 hover:bg-[#0B2419] hover:text-white transition-colors text-[12px] text-[#0B2419] font-semibold"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Xem &amp; Biến Thể</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Meta */}
        <div className="px-4 py-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#424844] border-t border-[#E8E9E3]">
          <div className="flex items-center gap-2">
            <span className="text-[#687069]">Hiển thị</span>
            <span className="font-semibold text-[#0B2419]">1 - 4</span>
            <span className="text-[#687069]">trên tổng số</span>
            <span className="font-semibold text-[#0B2419]">48</span>
            <span className="text-[#687069]">dòng sản phẩm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1.5 bg-[#f3f4ef] text-[#687069] cursor-not-allowed font-medium rounded" disabled type="button">
              Trang Trước
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-[#0B2419] text-white font-medium rounded" type="button">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-[#f3f4ef] hover:bg-[#edeee9] text-[#191c19] font-medium rounded transition-colors" type="button">
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-[#f3f4ef] hover:bg-[#edeee9] text-[#191c19] font-medium rounded transition-colors" type="button">
              3
            </button>
            <span className="px-1 text-[#687069]">...</span>
            <button className="px-3 py-1.5 bg-[#f3f4ef] hover:bg-[#edeee9] text-[#0B2419] font-medium rounded transition-colors" type="button">
              Trang Kế
            </button>
          </div>
        </div>
      </div>

      {/* 3. PRODUCT DETAIL & VARIANTS DRAWER / PANEL CHUYÊN SÂU */}
      {showDrawer && (
        <section className="bg-white border border-[#E8E9E3] shadow-md">
          {/* Panel Header */}
          <div className="px-6 py-4 bg-[#0B2419] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded bg-[#1B5038] flex items-center justify-center text-[#E8C75B]">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base text-white">
                    Chi Tiết Sản Phẩm &amp; Quản Lý Ma Trận Biến Thể
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-[#E8C75B] text-[#071A12] text-[11px] font-mono font-bold uppercase">
                    #{selectedProductId}
                  </span>
                </div>
                <p className="text-[12px] text-white/80">
                  Quần Jean Straight Fit Dark Indigo Selvedge · Quản lý kích cỡ, màu sắc &amp; tồn kho
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast('Mở lịch sử cập nhật biến thể sản phẩm')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B5038] hover:bg-[#123A29] text-white text-[12px] font-medium transition-colors rounded"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>Lịch Sử Cập Nhật</span>
              </button>
              <button
                onClick={() => setShowDrawer(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[12px] font-medium transition-colors rounded"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Thu Gọn</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Product Info Form View (Grid 3 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-[#E8E9E3]">
              {/* Column 1: Image & Identity */}
              <div className="flex gap-4">
                <div className="w-24 h-32 bg-[#edeee9] flex-shrink-0 relative overflow-hidden border border-[#E8E9E3]">
                  <img
                    alt="Dark Indigo Selvedge Thumbnail"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfAxdArJcLa2lcaR9A16iev0aNRYdig4hYk_md_OzMAsEXUXXzCPQgotSCj-clRqNeS133rfXONEIB1K9Y4Z3IJ2nxJcTLxP4DxL0LqwexjkrW6w6U1Px7g3_BT-k2QbU9yoXhV5bCp_Av5NxVysOpct8DPMHG4I2NtJHmAXeG6dNd70CBNfcjJzePYfrsV3pMwHc-PfUX9t_IBAfS9uCOxNtWEzD283GyiAUz7mjGvPRnUSqiQWNn9A"
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">Tên Sản Phẩm Chính</span>
                  <p className="font-semibold text-[#0B2419] text-sm leading-snug">
                    Quần Jean Straight Fit Dark Indigo Selvedge
                  </p>
                  <div className="text-[12px] text-[#687069] font-mono">
                    SKU Mẹ: <span className="text-[#0B2419] font-medium">KMD-ST-01</span>
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1B5038]/10 text-[#1B5038] text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                      ON_SALE (Đang Bán)
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 2: System Attributes Linkage */}
              <div className="space-y-3 bg-[#f3f4ef] p-4 rounded border border-[#E8E9E3]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">Thuộc Tính Liên Kết</span>
                  <button
                    onClick={() => showToast('Mở cửa sổ sửa thuộc tính liên kết')}
                    className="text-[11px] font-medium text-[#1B5038] hover:underline flex items-center"
                  >
                    Sửa phân cấp <span className="material-symbols-outlined text-[13px] ml-0.5">open_in_new</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-[#687069] block text-[11px]">Cây Danh Mục:</span>
                    <span className="font-semibold text-[#0B2419]">Quần &gt; Jean Selvedge</span>
                  </div>
                  <div>
                    <span className="text-[#687069] block text-[11px]">Xưởng Dệt Vải:</span>
                    <span className="font-semibold text-[#0B2419]">Kurabo Mills Japan</span>
                  </div>
                  <div>
                    <span className="text-[#687069] block text-[11px]">Hệ Bảng Size:</span>
                    <span className="font-semibold text-[#0B2419] font-mono">DENIM_INCH (Waist)</span>
                  </div>
                  <div>
                    <span className="text-[#687069] block text-[11px]">Màu Sắc Đại Diện:</span>
                    <span className="font-semibold text-[#0B2419]">3 Màu chuẩn hoá</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Pricing & Material Specs */}
              <div className="space-y-3 bg-[#f3f4ef] p-4 rounded border border-[#E8E9E3]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">Thông Số &amp; Định Giá Cơ Sở</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-[#687069] block text-[11px]">Giá Niêm Yết Cơ Sở (Base):</span>
                    <span className="font-bold text-[#0B2419] font-mono text-[14px]">1.850.000 ₫</span>
                  </div>
                  <div>
                    <span className="text-[#687069] block text-[11px]">Tổng Tồn Toàn Bộ Size:</span>
                    <span className="font-bold text-[#1B5038] font-mono text-[14px]">142 sản phẩm</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#687069] block text-[11px]">Chất Liệu, Bảo Quản &amp; Dịch Vụ:</span>
                    <span className="text-[#191c19] text-[12px]">
                      14oz Raw Selvedge Denim Okayama, wash lạnh riêng biệt.{' '}
                      <strong className="text-[#0B2419] font-semibold">
                        Hỗ trợ cắt gấu quần 15 phút tại showroom cho khách hàng
                      </strong>{' '}
                      khi mua hàng may sẵn.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants Management Sub-table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm text-[#0B2419] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#123A29]">view_list</span>
                    <span>Bảng Ma Trận Biến Thể Chi Tiết (Variants Matrix - 6 Kích Cỡ Hiện Hữu)</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-[12px] text-[#0B2419] font-medium bg-[#FAF4DF] px-2 py-0.5 border border-[#E8E9E3]">
                      <span className="material-symbols-outlined text-[14px] text-[#1B5038] align-middle mr-1">
                        check_circle
                      </span>
                      Hàng có sẵn từng size (28-34, S-XXL) - Tồn kho thực tế xuất bán ngay
                    </p>
                    <p className="text-[12px] text-[#1B5038] font-medium bg-[#1B5038]/10 px-2 py-0.5">
                      <span className="material-symbols-outlined text-[14px] align-middle mr-1">content_cut</span>
                      Hỗ trợ cắt gấu quần 15 phút tại showroom cho khách hàng
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => showToast('Mở công cụ đồng bộ giá bán hàng loạt')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e7e9e3] hover:bg-[#edeee9] text-[#0B2419] text-[12px] font-semibold transition-colors rounded"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Đồng Bộ Giá Hàng Loạt</span>
                  </button>
                  <button
                    onClick={() => showToast('Mở form tạo thêm SKU biến thể mới')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B2419] text-white hover:bg-[#1B5038] text-[12px] font-semibold transition-colors shadow-sm rounded"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>+ Thêm Biến Thể Mới</span>
                  </button>
                </div>
              </div>

              {/* Variants Table */}
              <div className="overflow-x-auto border border-[#E8E9E3] bg-white">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#f3f4ef] text-[#0B2419] font-semibold uppercase tracking-wider text-[11px] border-b border-[#E8E9E3]">
                      <th className="py-2.5 px-3">Size Value</th>
                      <th className="py-2.5 px-3">Màu Sắc Vải</th>
                      <th className="py-2.5 px-3">Mã SKU Biến Thể</th>
                      <th className="py-2.5 px-3">Giá Niêm Yết Ghi Đè (Override)</th>
                      <th className="py-2.5 px-3">Tồn Khả Dụng</th>
                      <th className="py-2.5 px-3">Trạng Thái Bán</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E9E3]">
                    {[
                      { size: '28', stock: '24 cái', override: false },
                      { size: '29', stock: '30 cái', override: false },
                      { size: '30', stock: '36 cái', override: false },
                      { size: '31', stock: '22 cái', override: false },
                      { size: '32', stock: '18 cái', override: false },
                      { size: '34', stock: '12 cái', override: true, price: '2.150.000 ₫' }
                    ].map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.override
                            ? 'bg-[#FAF4DF]/40 hover:bg-[#FAF4DF]/60 transition-colors border-l-2 border-l-[#725c00]'
                            : 'hover:bg-[#FFFDF5]/50 transition-colors'
                        }
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0B2419]">
                          <span className={row.override ? 'px-2 py-0.5 bg-[#725c00]/10 text-[#725c00]' : 'px-2 py-0.5 bg-[#e7e9e3]'}>
                            {row.size}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#0B1A30] border border-black/10"></span>
                            <span>Raw Dark Indigo</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#687069] text-[12px]">
                          DENIM-KRB-IND-{row.size}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.override ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#725c00] text-[13px]">{row.price}</span>
                              <span className="px-1.5 py-0.2 bg-[#725c00] text-white text-[9px] font-semibold uppercase">
                                Override (+300k)
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#687069] italic">Theo giá gốc (1.850.000₫)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#1B5038]">
                          {row.stock}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.override ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#725c00]/15 text-[#725c00] text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#725c00]"></span> Sắp Hết Hàng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1B5038]/10 text-[#1B5038] text-[11px] font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span> Đang Bán
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => showToast(`Cập nhật giá SKU DENIM-KRB-IND-${row.size}`)}
                            className="px-2 py-1 text-[#0B2419] hover:text-[#1B5038] font-medium text-[11px]"
                            type="button"
                          >
                            Sửa Giá
                          </button>
                          <button
                            onClick={() => showToast(`Kiểm kê tồn kho SKU DENIM-KRB-IND-${row.size}`)}
                            className="px-2 py-1 text-[#687069] hover:text-[#0B2419] text-[11px]"
                            type="button"
                          >
                            Kho
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E8E9E3]">
              <div className="text-[12px] text-[#687069] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#1B5038]">check_circle</span>
                <span>
                  Đã xác thực dữ liệu biến thể với xưởng dệt Kurabo Okayama. Hàng may sẵn sẵn sàng xuất kho ngay · Hỗ trợ cắt gấu quần 15 phút tại showroom cho khách hàng.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDrawer(false)}
                  className="px-4 py-2 bg-[#f3f4ef] hover:bg-[#edeee9] text-[#191c19] text-[13px] font-medium transition-colors rounded"
                  type="button"
                >
                  Đóng / Thu Gọn
                </button>
                <button
                  onClick={() => showToast('Đã lưu thay đổi ma trận biến thể thành công!')}
                  className="px-5 py-2 bg-[#0B2419] text-white hover:bg-[#1B5038] text-[13px] font-semibold transition-colors shadow-sm uppercase tracking-wider rounded"
                  type="button"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
