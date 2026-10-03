import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type { CatalogProductView } from '../features/catalog/types';

type SortOption = 'newest' | 'price-asc' | 'price-desc';

export const CatalogScreen: React.FC = () => {
  const {
    setCurrentScreen,
    setSelectedProductId,
    wishlist,
    toggleWishlist,
  } = useApp();

  const [products, setProducts] = useState<CatalogProductView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const data = await catalogService.getProducts();
        if (active) {
          setProducts(data);
          setError(null);
        }
      } catch {
        if (active) {
          setError('Không thể tải danh sách sản phẩm.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  const displayedProducts = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('vi-VN');
    const filtered = query
      ? products.filter((product) =>
          [product.name, product.brand, product.category]
            .some((value) => value.toLocaleLowerCase('vi-VN').includes(query)),
        )
      : [...products];

    if (sortOption === 'price-asc') {
      filtered.sort((left, right) => left.price - right.price);
    } else if (sortOption === 'price-desc') {
      filtered.sort((left, right) => right.price - left.price);
    }

    return filtered;
  }, [products, searchTerm, sortOption]);

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-2 text-sm text-[#606863]">
          <button
            type="button"
            onClick={() => setCurrentScreen('home')}
            className="hover:text-[#0B2419]"
          >
            Trang chủ
          </button>
          <span>/</span>
          <span className="font-semibold text-[#0B2419]">Sản phẩm</span>
        </nav>
      </div>

      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
        <div className="mb-7 flex flex-col gap-4 border-b border-[#E8E9E3] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">
              FIDO Catalog
            </p>
            <h1 className="mt-1 font-serif text-3xl">Danh sách sản phẩm</h1>
            <p className="mt-2 text-sm text-[#687069]">
              Ảnh đại diện được lấy từ API catalog; URL tuyệt đối được dùng trực tiếp,
              URL tương đối được ghép qua cấu hình frontend.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, thương hiệu, danh mục"
              className="min-w-[280px] border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
            />
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
            >
              <option value="newest">Mặc định</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="py-20 text-center text-sm text-[#687069]">Đang tải sản phẩm...</div>
        )}

        {!loading && error && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && displayedProducts.length === 0 && (
          <div className="py-20 text-center text-sm text-[#687069]">
            Không có sản phẩm phù hợp.
          </div>
        )}

        {!loading && !error && displayedProducts.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedProducts.map((product) => {
              const favorite = wishlist.includes(product.id);
              return (
                <article
                  key={product.id}
                  className="group overflow-hidden border border-[#E8E9E3] bg-white transition hover:border-[#0B2419]"
                >
                  <div className="relative aspect-[3/4] bg-[#F3F4EF]">
                    <button
                      type="button"
                      onClick={() => openProduct(product.id)}
                      className="h-full w-full"
                      aria-label={`Xem ${product.name}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-sm text-[#8A918B]">
                          Chưa có ảnh
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(product.id)}
                      aria-label={favorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
                    >
                      <span className={`material-symbols-outlined ${favorite ? 'text-red-700' : ''}`}>
                        favorite
                      </span>
                    </button>
                  </div>

                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-[#687069]">
                      <span className="truncate">{product.category}</span>
                      <span className="truncate font-semibold text-[#0B2419]">
                        {product.brand || 'FIDO'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProduct(product.id)}
                      className="line-clamp-2 text-left text-base font-semibold hover:underline"
                    >
                      {product.name}
                    </button>
                    <p className="font-mono text-base font-bold">
                      {product.price.toLocaleString('vi-VN')}₫
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
