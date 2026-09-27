import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import { mockCatalogMeta } from '../mocks/apiData';
import { toUiProduct } from '../mocks/uiData';
import { Product } from '../types';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'availability';

export const CatalogScreen: React.FC = () => {
  const {
    setCurrentScreen,
    setSelectedProductId,
    addToCart,
    wishlist,
    toggleWishlist,
  } = useApp();

  const [products, setProducts] = useState<Array<Product & { product_id: number }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('ALL');
  const [brand, setBrand] = useState('ALL');
  const [size, setSize] = useState('ALL');
  const [color, setColor] = useState('ALL');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(3000000);
  const [sort, setSort] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 4;

  React.useEffect(() => {
    catalogService.getProducts().then((items) => {
      setProducts(items.map(toUiProduct));
    });
  }, []);

  const leafCategories = mockCatalogMeta.categories.filter((item) => item.parent_category_id !== null);
  const sizes = Array.from(
    new Set(mockCatalogMeta.size_systems.flatMap((system) => system.size_values.map((item) => item.display_name))),
  );

  const filtered = useMemo(() => {
    let list = [...products];

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((product) =>
        [product.name, product.brand, product.category, product.description]
          .some((value) => value.toLowerCase().includes(q)),
      );
    }

    if (category !== 'ALL') list = list.filter((product) => product.category === category);
    if (brand !== 'ALL') list = list.filter((product) => product.brand === brand);
    if (size !== 'ALL') list = list.filter((product) => product.sizes.map(String).includes(size));
    if (color !== 'ALL') list = list.filter((product) => product.colors.some((item) => item.name === color));

    list = list.filter((product) => product.price >= minPrice && product.price <= maxPrice);

    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'availability') list.sort((a, b) => b.inStockCount - a.inStockCount);
    if (sort === 'newest') list.sort((a, b) => b.product_id - a.product_id);

    return list;
  }, [products, searchTerm, category, brand, size, color, minPrice, maxPrice, sort]);

  React.useEffect(() => setPage(1), [searchTerm, category, brand, size, color, minPrice, maxPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleProducts = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategory('ALL');
    setBrand('ALL');
    setSize('ALL');
    setColor('ALL');
    setMinPrice(0);
    setMaxPrice(3000000);
    setSort('newest');
  };

  const activeFilterCount = [category, brand, size, color].filter((value) => value !== 'ALL').length
    + (searchTerm ? 1 : 0)
    + (minPrice !== 0 || maxPrice !== 3000000 ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F8FAF4]">
      <section className="border-b border-[#E2E5DE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B5038]">GET /api/v1/catalog/products</div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mt-2">
            <div>
              <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold text-[#0B2419]">Catalog mock</h1>
              <p className="text-sm text-[#687069] mt-2 max-w-2xl">
                Tìm kiếm, lọc và phân trang dùng đúng metadata Category, Brand, SizeValue, Color và dữ liệu ProductDetail mock.
              </p>
            </div>
            <div className="text-xs bg-[#FAF4DF] border border-[#E8C75B]/40 rounded px-4 py-2 text-[#625f4e]">
              {filtered.length} kết quả · {products.length} sản phẩm trong fixture
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#687069]">search</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên, brand, category, mô tả..."
                className="w-full pl-10 pr-3 py-3 border border-[#DCE0D9] rounded-lg text-sm bg-[#FAFBF8] focus:outline-none focus:border-[#0B2419]"
              />
            </div>
            <button type="button" onClick={resetFilters} className="px-4 py-3 border border-[#DCE0D9] rounded-lg text-xs font-bold text-[#0B2419] bg-white">
              Reset ({activeFilterCount})
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        <aside className="bg-white border border-[#E2E5DE] rounded-lg p-4 space-y-5 lg:sticky lg:top-20">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">Category lá</label>
            <select value={category} onChange={(event)=>setCategory(event.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded text-xs bg-[#FAFBF8]">
              <option value="ALL">Tất cả</option>
              {leafCategories.map((item)=><option key={item.category_id} value={item.name}>{item.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">Brand</label>
            <select value={brand} onChange={(event)=>setBrand(event.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded text-xs bg-[#FAFBF8]">
              <option value="ALL">Tất cả</option>
              {mockCatalogMeta.brands.map((item)=><option key={item.brand_id} value={item.name}>{item.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">SizeValue</label>
            <select value={size} onChange={(event)=>setSize(event.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded text-xs bg-[#FAFBF8]">
              <option value="ALL">Tất cả</option>
              {sizes.map((item)=><option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">Color</label>
            <select value={color} onChange={(event)=>setColor(event.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded text-xs bg-[#FAFBF8]">
              <option value="ALL">Tất cả</option>
              {mockCatalogMeta.colors.map((item)=><option key={item.color_id} value={item.name}>{item.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">Khoảng giá</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input type="number" min={0} value={minPrice} onChange={(event)=>setMinPrice(Number(event.target.value))} className="px-2 py-2 border rounded text-xs" />
              <input type="number" min={0} value={maxPrice} onChange={(event)=>setMaxPrice(Number(event.target.value))} className="px-2 py-2 border rounded text-xs" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-[#687069]">Sắp xếp</label>
            <select value={sort} onChange={(event)=>setSort(event.target.value as SortOption)} className="w-full mt-1 px-3 py-2.5 border rounded text-xs bg-[#FAFBF8]">
              <option value="newest">product_id mới trước</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="availability">Available quantity</option>
            </select>
          </div>

          <div className="text-[10px] text-[#687069] bg-[#F5F6F2] p-3 rounded leading-relaxed">
            Giá hiển thị lấy effective_price của variant đầu tiên; tồn hiển thị là tổng available_quantity của các variant trong fixture.
          </div>
        </aside>

        <main>
          {visibleProducts.length === 0 ? (
            <div className="bg-white border border-[#E2E5DE] rounded-lg p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-[#0B2419]/25">inventory_2</span>
              <h2 className="font-bold text-[#0B2419] mt-3">Không có sản phẩm phù hợp</h2>
              <p className="text-xs text-[#687069] mt-1">Reset filter để tiếp tục test catalog mock.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {visibleProducts.map((product) => {
                const favorite = wishlist.includes(product.id);
                return (
                  <article key={product.id} className="bg-white border border-[#E2E5DE] rounded-lg overflow-hidden group">
                    <button type="button" onClick={()=>openProduct(product.id)} className="block relative w-full aspect-[4/5] bg-[#F3F4EF] overflow-hidden text-left">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                      <span className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold bg-[#0B2419] text-white rounded">{product.statusBadge}</span>
                    </button>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[#687069]">{product.category} · {product.brand}</div>
                          <button type="button" onClick={()=>openProduct(product.id)} className="text-left font-bold text-[#0B2419] mt-1 hover:text-[#1B5038]">{product.name}</button>
                        </div>
                        <button type="button" onClick={()=>toggleWishlist(product.id)} className="p-1 text-[#0B2419]" aria-label="Yêu thích">
                          <span className="material-symbols-outlined text-[20px]">{favorite ? 'favorite' : 'favorite_border'}</span>
                        </button>
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="text-lg font-bold text-[#0B2419]">{money(product.price)}</div>
                          <div className="text-[10px] text-[#687069]">available_quantity: {product.inStockCount}</div>
                        </div>
                        <button
                          type="button"
                          disabled={product.inStockCount <= 0}
                          onClick={()=>addToCart(product)}
                          className="px-3 py-2 bg-[#0B2419] disabled:opacity-40 text-white text-[10px] uppercase font-bold rounded"
                        >
                          Thêm variant
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between bg-white border border-[#E2E5DE] rounded-lg px-4 py-3">
            <span className="text-xs text-[#687069]">Trang {page}/{totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))} className="px-3 py-1.5 border rounded text-xs font-bold disabled:opacity-40">Trước</button>
              <button disabled={page>=totalPages} onClick={()=>setPage((value)=>Math.min(totalPages,value+1))} className="px-3 py-1.5 border rounded text-xs font-bold disabled:opacity-40">Sau</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
