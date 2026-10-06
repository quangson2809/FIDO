import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type { CatalogMetaDto, CatalogProductView } from '../features/catalog/types';

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB43j3U0QGfklvPCyrYdm_4uqdh7U1m_789gJgb9dh6wEkBdhY0mzlP7RRDQrhmLsrOknJ0jGRSmcq2PpIVgOXBQ4oZv3lNU8bndQhMe1NvknIqzt4CKSagNfZxwQWAon2oy6ggXrwuqZITn4oBz_g9S47_4eVaQuBi8oxwXP7nih4Pze-AjnEh0sTWqBN0FpTQKswUiZsjLo6Gn8-32F9v9d7VMDcwjWJJ1bBVwriGH43Q4012h51B1A';

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

export const HomeScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedProductId } = useApp();
  const [products, setProducts] = useState<CatalogProductView[]>([]);
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [productPage, catalogMeta] = await Promise.all([
          catalogService.listProducts({ page: 0, page_size: 8 }),
          catalogService.getMeta(),
        ]);
        if (!active) return;
        setProducts(productPage.items);
        setMeta(catalogMeta);
        setError(null);
      } catch {
        if (active) setError('Không thể tải dữ liệu catalog.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const rootCategories = meta?.categories.filter((category) => category.parent_category_id === null) ?? [];

  return (
    <div className="w-full bg-white text-[#0B2419]" id="trang-chu">
      <div className="flex h-[44px] w-full items-center border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 text-[13px] font-medium text-[#606863] sm:px-8">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#0B2419]">FIDO</span>
          <span className="text-[#9CA3AF]">/</span>
          <span>Ready-to-Wear</span>
        </div>
      </div>

      <section className="relative w-full overflow-hidden bg-[#FFFDF5]">
        <div className="grid min-h-[650px] w-full grid-cols-1 lg:min-h-[760px] lg:grid-cols-12">
          <div className="relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:col-span-5 lg:p-14">
            <div className="space-y-4 pt-2 lg:pt-8">
              <div className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#E8C75B]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0B2419]">
                  FIDO • READY-TO-WEAR
                </span>
              </div>
              <h1 className="font-serif text-5xl font-normal leading-[1.02] tracking-tight text-[#0B2419] sm:text-6xl lg:text-[68px]">
                BẢN THỂ
                <br />
                <span className="italic text-[#123A29]">TỐI GIẢN.</span>
              </h1>
              <p className="max-w-md pt-2 text-[15px] font-light leading-7 text-[#424844] sm:text-[16px]">
                Không gian mua sắm FIDO giữ tinh thần thời trang tối giản, tập trung vào sản phẩm, phom dáng và trải nghiệm chọn biến thể rõ ràng.
              </p>
              <div className="flex flex-col items-stretch gap-3 pt-6 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="inline-flex items-center justify-center gap-2 bg-[#0B2419] px-7 py-4 text-[12px] font-bold uppercase tracking-widest text-white shadow-md transition-all duration-300 hover:bg-[#1B5038]"
                >
                  <span>Khám phá bộ sưu tập</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <a
                  href="#san-pham-noi-bat"
                  className="inline-flex items-center justify-center border border-[#0B2419]/30 bg-transparent px-7 py-4 text-[12px] font-bold uppercase tracking-widest text-[#0B2419] transition-all duration-300 hover:bg-[#FAF4DF]"
                >
                  Xem sản phẩm nổi bật
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-[#E8E9E3]/80 pb-2 pt-10 text-[#0B2419]">
              <div>
                <span className="block font-serif text-xl font-bold sm:text-2xl">CATALOG</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#606863] sm:text-[10px]">Bộ sưu tập FIDO</span>
              </div>
              <div>
                <span className="block font-serif text-xl font-bold sm:text-2xl">SIZE + MÀU</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#606863] sm:text-[10px]">Lựa chọn biến thể</span>
              </div>
              <div>
                <span className="block font-serif text-xl font-bold sm:text-2xl">COD</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#606863] sm:text-[10px]">Thanh toán khi nhận</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[460px] overflow-hidden lg:col-span-7 lg:min-h-full">
            <img
              alt="FIDO Ready-to-Wear editorial"
              className="h-full w-full scale-[1.02] object-cover object-center transition-transform duration-700 hover:scale-100"
              src={HERO_IMAGE}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/45 via-transparent to-transparent" />
            <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-[#071A12]/85 px-4 py-2.5 text-[#FFFDF5] shadow-lg backdrop-blur-md lg:bottom-10 lg:right-10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E8C75B]" />
              <span className="text-[10px] font-bold uppercase tracking-widest">FIDO Editorial • Minimal Wardrobe</span>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-y border-[#E8E9E3]/80 bg-[#FFFDF5] py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-14">
          {[
            ['account_tree', 'Danh mục rõ ràng', 'Khám phá sản phẩm theo từng nhóm danh mục.'],
            ['tune', 'Chọn đúng biến thể', 'Lựa chọn size và màu phù hợp cho từng sản phẩm.'],
            ['inventory_2', 'Thông tin minh bạch', 'Giá và khả dụng được hiển thị ngay trong trải nghiệm mua sắm.'],
            ['payments', 'Thanh toán COD', 'Đặt hàng sau khi đăng nhập và thanh toán khi nhận hàng.'],
          ].map(([icon, title, description]) => (
            <div key={title} className="flex items-start gap-4">
              <span className="material-symbols-outlined mt-0.5 text-[28px] text-[#0B2419]">{icon}</span>
              <div className="space-y-1">
                <h3 className="text-[15px] font-bold text-[#0B2419]">{title}</h3>
                <p className="text-[12px] leading-5 text-[#606863]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full bg-white py-14" id="danh-muc">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-4 border-b border-[#E8E9E3] pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B5038]">Khám phá theo nhóm</span>
              <h2 className="font-serif text-3xl text-[#0B2419] sm:text-4xl">DANH MỤC SẢN PHẨM</h2>
              <p className="mt-2 text-[13px] text-[#606863]">Chọn nhóm sản phẩm phù hợp với phong cách của bạn.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentScreen('catalog')}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B2419]"
            >
              Xem toàn bộ
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {loading && <div className="py-8 text-sm text-[#687069]">Đang tải danh mục...</div>}
          {!loading && error && <div className="py-8 text-sm text-red-700">{error}</div>}
          {!loading && !error && rootCategories.length === 0 && (
            <div className="py-8 text-sm text-[#687069]">Chưa có danh mục gốc để hiển thị.</div>
          )}
          {!loading && !error && rootCategories.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rootCategories.slice(0, 8).map((category, index) => (
                <button
                  key={category.category_id}
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="group relative min-h-36 overflow-hidden border border-[#E8E9E3] bg-[#FAF9F5] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#0B2419] hover:shadow-md"
                >
                  <span className="absolute right-4 top-3 font-serif text-5xl text-[#0B2419]/5">0{index + 1}</span>
                  <span className="material-symbols-outlined text-[24px] text-[#1B5038]">category</span>
                  <h3 className="mt-7 font-serif text-xl font-bold text-[#0B2419]">{category.name}</h3>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#687069] group-hover:text-[#0B2419]">
                    Khám phá
                    <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full bg-[#FAF9F5] py-14" id="san-pham-noi-bat">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-4 border-b border-[#D9DDD6] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B5038]">FIDO Selection</span>
              <h2 className="font-serif text-3xl text-[#0B2419] sm:text-4xl">SẢN PHẨM NỔI BẬT</h2>
              <p className="mt-2 text-[13px] text-[#606863]">Một số thiết kế đang có trong catalog FIDO.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentScreen('catalog')}
              className="border border-[#0B2419] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-[#0B2419] hover:text-white"
            >
              Xem catalog
            </button>
          </div>

          {!loading && !error && products.length === 0 && (
            <div className="py-12 text-center text-sm text-[#687069]">Catalog chưa có sản phẩm để hiển thị.</div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="mt-7 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => openProduct(product.id)}
                  className="group text-left"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#ECEDE8] ring-1 ring-[#E2E5DE]">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full bg-[#071A12]/88 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white transition-transform duration-300 group-hover:translate-y-0">
                      Xem chi tiết sản phẩm
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-4">
                    <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-[#687069]">
                      <span>{product.category}</span>
                      <span>{product.brand || 'FIDO'}</span>
                    </div>
                    <h3 className="line-clamp-2 text-[14px] font-semibold leading-5 text-[#0B2419]">{product.name}</h3>
                    <p className="font-mono text-sm font-bold text-[#0B2419]">{money(product.base_price)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071A12] text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full border border-[#E8C75B]/40" />
          <div className="absolute -bottom-40 right-10 h-[520px] w-[520px] rounded-full border border-white/10" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-14 lg:py-20">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#E8C75B]">FIDO Editorial</span>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Tối giản trong hình thức. Rõ ràng trong từng lựa chọn.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
              Khám phá những thiết kế FIDO trong một không gian tinh gọn, nơi hình ảnh, phom dáng, màu sắc và trải nghiệm lựa chọn sản phẩm được đặt ở trung tâm.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentScreen('catalog')}
            className="shrink-0 bg-[#E8C75B] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#071A12] transition-transform hover:-translate-y-0.5"
          >
            Mở catalog
          </button>
        </div>
      </section>
    </div>
  );
};
