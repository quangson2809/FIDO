import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type { CatalogMetaDto, CatalogProductView } from '../features/catalog/types';

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
          catalogService.listProducts({ page: 0, page_size: 6 }),
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
    <div className="min-h-screen bg-white text-[#0B2419]">
      <section className="border-b border-[#E8E9E3] bg-[#FFFDF5]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:px-14 lg:py-24">
          <div className="self-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#1B5038]">FIDO Fashion</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Khám phá catalog thời trang FIDO</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#424844]">
              Xem sản phẩm, chọn đúng biến thể size và màu, kiểm tra giá và khả dụng từ dữ liệu catalog hiện tại.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCurrentScreen('catalog')}
                className="bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white"
              >
                Xem sản phẩm
              </button>
              <button
                type="button"
                onClick={() => setCurrentScreen('policy')}
                className="border border-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-wider"
              >
                Xem chính sách
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[#E8E9E3] bg-white p-6">
              <span className="material-symbols-outlined text-3xl">checkroom</span>
              <h2 className="mt-4 font-serif text-xl">Size và màu theo biến thể</h2>
              <p className="mt-2 text-sm leading-6 text-[#606863]">Lựa chọn mua được ánh xạ tới ProductVariant thực tế của catalog.</p>
            </div>
            <div className="border border-[#E8E9E3] bg-white p-6">
              <span className="material-symbols-outlined text-3xl">payments</span>
              <h2 className="mt-4 font-serif text-xl">Thanh toán COD</h2>
              <p className="mt-2 text-sm leading-6 text-[#606863]">Phương thức thanh toán baseline của FIDO là thanh toán khi nhận hàng.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-4 border-b border-[#E8E9E3] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">Catalog metadata</p>
            <h2 className="mt-1 font-serif text-3xl">Danh mục</h2>
          </div>
          <button type="button" onClick={() => setCurrentScreen('catalog')} className="text-sm font-semibold underline">
            Xem toàn bộ catalog
          </button>
        </div>

        {loading && <div className="py-10 text-sm text-[#687069]">Đang tải catalog...</div>}
        {!loading && error && <div className="py-10 text-sm text-red-700">{error}</div>}
        {!loading && !error && rootCategories.length === 0 && (
          <div className="py-10 text-sm text-[#687069]">Chưa có danh mục gốc để hiển thị.</div>
        )}
        {!loading && !error && rootCategories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {rootCategories.map((category) => (
              <button
                key={category.category_id}
                type="button"
                onClick={() => setCurrentScreen('catalog')}
                className="border border-[#D9DDD6] px-4 py-2 text-sm font-semibold hover:border-[#0B2419]"
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 lg:px-14">
        <div className="border-b border-[#E8E9E3] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">Sản phẩm</p>
          <h2 className="mt-1 font-serif text-3xl">Một số sản phẩm đang hiển thị</h2>
        </div>

        {!loading && !error && products.length === 0 && (
          <div className="py-12 text-center text-sm text-[#687069]">Catalog chưa có sản phẩm để hiển thị.</div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.product_id}
                type="button"
                onClick={() => openProduct(product.id)}
                className="overflow-hidden border border-[#E8E9E3] bg-white text-left hover:border-[#0B2419]"
              >
                <div className="aspect-[3/4] bg-[#F3F4EF]">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</span>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-wide text-[#687069]">{product.category}</p>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="font-mono font-bold">{product.base_price.toLocaleString('vi-VN')}₫</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
