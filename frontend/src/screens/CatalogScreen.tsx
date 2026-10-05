import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type {
  CatalogMetaDto,
  CatalogProductView,
} from '../features/catalog/types';
import type { PaginationMeta } from '../types/api';

const PAGE_SIZE = 12;

export const CatalogScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedProductId } = useApp();
  const [products, setProducts] = useState<CatalogProductView[]>([]);
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [brandId, setBrandId] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadMeta = async () => {
      try {
        const data = await catalogService.getMeta();
        if (active) setMeta(data);
      } catch {
        if (active) setError('Không thể tải metadata catalog.');
      } finally {
        if (active) setMetaLoading(false);
      }
    };

    void loadMeta();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      try {
        const result = await catalogService.listProducts({
          ...(query ? { q: query } : {}),
          ...(categoryId !== undefined ? { category_id: categoryId } : {}),
          ...(brandId !== undefined ? { brand_id: brandId } : {}),
          page,
          page_size: PAGE_SIZE,
        });
        if (!active) return;
        setProducts(result.items);
        setPagination(result.meta);
        setError(null);
      } catch {
        if (active) setError('Không thể tải danh sách sản phẩm.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProducts();
    return () => {
      active = false;
    };
  }, [brandId, categoryId, page, query]);

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setQuery(searchInput.trim());
  };

  const totalPages = pagination?.total_pages ?? 0;

  return (
    <div className="min-h-screen bg-white text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-2 text-sm text-[#606863]">
          <button type="button" onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">Trang chủ</button>
          <span>/</span>
          <span className="font-semibold text-[#0B2419]">Sản phẩm</span>
        </nav>
      </div>

      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
        <div className="mb-7 border-b border-[#E8E9E3] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">FIDO Catalog</p>
          <h1 className="mt-1 font-serif text-3xl">Danh sách sản phẩm</h1>
          <p className="mt-2 text-sm text-[#687069]">Tìm kiếm và bộ lọc sử dụng trực tiếp contract catalog của backend.</p>
        </div>

        <div className="mb-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_240px]">
          <form onSubmit={submitSearch} className="flex min-w-0 gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm sản phẩm"
              className="min-w-0 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
            />
            <button type="submit" className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Tìm</button>
          </form>

          <select
            aria-label="Lọc theo danh mục"
            disabled={metaLoading}
            value={categoryId ?? ''}
            onChange={(event) => {
              setCategoryId(event.target.value ? Number(event.target.value) : undefined);
              setPage(0);
            }}
            className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
          >
            <option value="">Tất cả danh mục</option>
            {meta?.categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>{category.name}</option>
            ))}
          </select>

          <select
            aria-label="Lọc theo thương hiệu"
            disabled={metaLoading}
            value={brandId ?? ''}
            onChange={(event) => {
              setBrandId(event.target.value ? Number(event.target.value) : undefined);
              setPage(0);
            }}
            className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
          >
            <option value="">Tất cả thương hiệu</option>
            {meta?.brands.map((brand) => (
              <option key={brand.brand_id} value={brand.brand_id}>{brand.name}</option>
            ))}
          </select>
        </div>

        {loading && <div className="py-20 text-center text-sm text-[#687069]">Đang tải sản phẩm...</div>}
        {!loading && error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && products.length === 0 && (
          <div className="py-20 text-center text-sm text-[#687069]">Không có sản phẩm phù hợp. Hãy thay đổi tiêu chí tìm kiếm hoặc bộ lọc.</div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article key={product.id} className="group overflow-hidden border border-[#E8E9E3] bg-white transition hover:border-[#0B2419]">
                  <button type="button" onClick={() => openProduct(product.id)} className="block w-full text-left">
                    <div className="aspect-[3/4] bg-[#F3F4EF]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</span>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-[#687069]">
                        <span className="truncate">{product.category}</span>
                        {product.brand && <span className="truncate font-semibold text-[#0B2419]">{product.brand}</span>}
                      </div>
                      <h2 className="line-clamp-2 text-base font-semibold">{product.name}</h2>
                      <p className="font-mono text-base font-bold">{product.base_price.toLocaleString('vi-VN')}₫</p>
                    </div>
                  </button>
                </article>
              ))}
            </div>

            {pagination && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="border border-[#D9DDD6] px-4 py-2 disabled:opacity-40"
                >
                  Trang trước
                </button>
                <span>Trang {page + 1} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((current) => current + 1)}
                  className="border border-[#D9DDD6] px-4 py-2 disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
