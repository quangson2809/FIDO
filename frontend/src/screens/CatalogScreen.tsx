import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import { toUiProduct } from '../mocks/uiData';

export const CatalogScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedProductId, addToCart, wishlist, toggleWishlist } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Quần jeans & Denim');
  const [selectedBrand, setSelectedBrand] = useState<string>('Kurabo Okayama Denim');
  const [selectedSize, setSelectedSize] = useState<string | number>('31');
  const [selectedColor, setSelectedColor] = useState<string>('Chàm Indigo');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [columnsCount, setColumnsCount] = useState<3 | 4>(4);
  const [sortOption, setSortOption] = useState<'newest' | 'price-asc' | 'price-desc' | 'bestseller'>('newest');
  const [priceFrom, setPriceFrom] = useState('300.000₫');
  const [priceTo, setPriceTo] = useState('2.500.000₫');

  const [products, setProducts] = useState<any[]>([]);
  
  React.useEffect(() => {
    catalogService.getProducts().then((items) => setProducts(items.map(toUiProduct)));
  }, []);

  // Search and filter
  const displayedProducts = useMemo(() => {
    let list = [...products];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'Tất cả' && selectedCategory) {
      list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedBrand !== 'Tất cả' && selectedBrand) {
      list = list.filter((p) => p.brand.toLowerCase() === selectedBrand.toLowerCase());
    }
    if (selectedSize !== 'Tất cả' && selectedSize) {
      list = list.filter((p) => p.sizes.some((size: string | number) => String(size) === String(selectedSize)));
    }
    if (selectedColor !== 'Tất cả' && selectedColor) {
      list = list.filter((p) => p.colors.some((color: { name: string }) => color.name === selectedColor));
    }

    if (sortOption === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, searchTerm, selectedCategory, selectedBrand, selectedSize, selectedColor, sortOption]);

  const handleOpenProduct = (id: string) => {
    setSelectedProductId(id);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSelectedCategory('Tất cả');
    setSelectedBrand('Tất cả');
    setSelectedSize('31');
    setSelectedColor('Tất cả');
    setSearchTerm('');
  };

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen">
      {/* Top Breadcrumb */}
      <div className="w-full h-[44px] bg-[#F5F6F2] border-b border-[#E2E5DE] px-4 sm:px-8 flex items-center text-[13px] text-[#606863] font-medium">
        <nav className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419] transition-colors">
            Trang chủ
          </button>
          <span className="text-[#9CA3AF]">/</span>
          <span className="text-[#0B2419] font-semibold">Tất cả sản phẩm</span>
        </nav>
      </div>

      {/* KHỐI A — THANH TÌM KIẾM & BỘ ĐIỀU HƯỚNG NHANH */}
      <section className="w-full bg-[#FFFFFF] border-b border-[#E8E9E3] py-5 px-4 sm:px-8 lg:px-14">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4">
          {/* Search bar container */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <label
              htmlFor="catalogSearchInput"
              className="text-[15px] text-[#071810] whitespace-nowrap uppercase tracking-wider font-bold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[20px] text-[#0B2419]">search</span>
              Tìm sản phẩm:
            </label>
            <div className="flex-1 flex items-center relative border border-[#625f4e]/30 bg-[#FFFDF5] focus-within:border-[#0B2419] focus-within:ring-1 focus-within:ring-[#0B2419] transition-all">
              <input
                id="catalogSearchInput"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập tên sản phẩm, chất liệu denim, mã áo sơ mi..."
                className="w-full py-2.5 pl-4 pr-10 bg-transparent text-[#101310] text-[14px] placeholder:text-[#687069] focus:outline-none border-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa nội dung"
                  className="p-2 text-[#687069] hover:text-[#0B2419] focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
            <button
              type="button"
              className="bg-[#0B2419] hover:bg-[#1B5038] text-white text-[12px] font-bold uppercase tracking-widest px-6 py-3 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Tìm kiếm</span>
            </button>
          </div>

          {/* Trending keywords */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
            <span className="text-[#625f4e] uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#725c00]">trending_up</span>
              Gợi ý từ khóa thịnh hành:
            </span>
            {['Quần jean dark indigo', 'Áo sơ mi cuban', 'Áo len merino', 'Blazer may sẵn'].map((kw) => (
              <button
                key={kw}
                onClick={() => setSearchTerm(kw)}
                className="px-2.5 py-1 bg-[#f3f4ef] hover:bg-[#FAF4DF] text-[#101310] transition-colors border border-transparent hover:border-[#E8C75B]"
              >
                {kw}
              </button>
            ))}
          </div>

          {/* Quick filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {[
              { label: 'Tất cả (124)', q: '' },
              { label: 'Áo Sơ Mi (32)', q: 'Áo Sơ Mi' },
              { label: 'Quần Jean Raw (28)', q: 'Quần Jean' },
              { label: 'Áo Len & Dệt Kim (24)', q: 'Áo Len' },
              { label: 'Áo Blazer & Khoác (18)', q: 'Blazer' },
              { label: 'Phụ Kiện Da (22)', q: 'Phụ Kiện' }
            ].map((tab, idx) => (
              <button
                key={tab.label}
                onClick={() => setSearchTerm(tab.q)}
                className={`px-4 py-2 text-[11px] uppercase tracking-wider font-bold shrink-0 transition-colors ${
                  (searchTerm === tab.q && idx === 0 && !searchTerm) || (searchTerm && searchTerm === tab.q)
                    ? 'bg-[#0B2419] text-white'
                    : 'bg-[#f3f4ef] text-[#424844] hover:bg-[#FAF4DF]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area: Sidebar Filters + Products Grid */}
      <div className="w-full px-4 sm:px-8 lg:px-14 py-6 max-w-[1440px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* KHỐI B — BỘ LỌC ĐẦY ĐỦ CÁC NHÓM (Sidebar bên trái) */}
          {isSidebarVisible && (
            <aside className="w-full lg:w-[290px] shrink-0 flex flex-col gap-4 border border-[#E8E9E3] p-4 bg-white shadow-sm">
              {/* Sticky title / Header of Filters */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#0B2419]">tune</span>
                  <h2 className="text-[16px] text-[#071810] uppercase tracking-wider font-bold">
                    Bộ Lọc Chi Tiết
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-[#725c00] hover:underline uppercase"
                >
                  Đặt Lại
                </button>
              </div>

              {/* Active filters badge summary */}
              <div className="bg-[#FAF4DF] p-3 flex flex-col gap-2 border border-[#E8C75B]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#071810] font-bold">
                    Đang áp dụng (3)
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-[#725c00] hover:underline uppercase font-bold"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[11px] uppercase tracking-wide text-[#0B2419] border border-[#E8E9E3] font-semibold">
                    Quần Jean <span className="material-symbols-outlined text-[13px] cursor-pointer">close</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[11px] uppercase tracking-wide text-[#0B2419] border border-[#E8E9E3] font-semibold">
                    Màu Indigo <span className="material-symbols-outlined text-[13px] cursor-pointer">close</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white text-[11px] uppercase tracking-wide text-[#0B2419] border border-[#E8E9E3] font-semibold">
                    Size: 31 <span className="material-symbols-outlined text-[13px] cursor-pointer">close</span>
                  </span>
                </div>
              </div>

              {/* Filter Group: Categories */}
              <div className="space-y-1 pt-1 border-b border-[#E8E9E3] pb-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[14px] text-[#071810] uppercase tracking-wider font-bold">Danh Mục</h3>
                  <span className="material-symbols-outlined text-[18px] text-[#625f4e]">expand_less</span>
                </div>
                <div className="space-y-1 text-[13px]">
                  {[
                    { label: 'Áo sơ mi cao cấp', count: 24 },
                    { label: 'Quần jeans & Denim', count: 28, checked: true },
                    { label: 'Áo Blazer & Áo khoác', count: 18 },
                    { label: 'Đồ dệt kim & Len merino', count: 22 },
                    { label: 'Quần Tây & Short', count: 16 },
                    { label: 'Phụ kiện da thảo mộc', count: 16 }
                  ].map((cat) => (
                    <label key={cat.label} className="flex items-center justify-between cursor-pointer group py-0.5">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          defaultChecked={cat.checked}
                          onChange={() => setSelectedCategory(cat.label)}
                          className="w-4 h-4 accent-[#0B2419] cursor-pointer rounded-none"
                        />
                        <span className={`group-hover:text-[#1B5038] ${cat.checked ? 'text-[#101310] font-bold' : 'text-[#191c19]'}`}>
                          {cat.label}
                        </span>
                      </span>
                      <span className="text-[#687069] text-[11px]">({cat.count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Group: Brands */}
              <div className="space-y-1 pt-1 border-b border-[#E8E9E3] pb-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[14px] text-[#071810] uppercase tracking-wider font-bold">Thương Hiệu</h3>
                  <span className="material-symbols-outlined text-[18px] text-[#625f4e]">expand_less</span>
                </div>
                <div className="space-y-1 text-[13px]">
                  {[
                    { label: 'Atelier Vert Heritage', count: 42 },
                    { label: 'Kurabo Okayama Denim', count: 28, checked: true },
                    { label: 'Loro Piana Fabrics', count: 18 },
                    { label: 'Albini Luxury Cotton', count: 20 },
                    { label: 'Urban Wear Studio', count: 16 }
                  ].map((brand) => (
                    <label key={brand.label} className="flex items-center justify-between cursor-pointer group py-0.5">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          defaultChecked={brand.checked}
                          onChange={() => setSelectedBrand(brand.label)}
                          className="w-4 h-4 accent-[#0B2419] cursor-pointer rounded-none"
                        />
                        <span className={`group-hover:text-[#1B5038] ${brand.checked ? 'text-[#101310] font-bold' : 'text-[#191c19]'}`}>
                          {brand.label}
                        </span>
                      </span>
                      <span className="text-[#687069] text-[11px]">({brand.count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter Group: Price Range */}
              <div className="space-y-1 pt-1 border-b border-[#E8E9E3] pb-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[14px] text-[#071810] uppercase tracking-wider font-bold">Khoảng Giá</h3>
                  <span className="material-symbols-outlined text-[18px] text-[#625f4e]">expand_less</span>
                </div>
                <div className="space-y-1.5 text-[13px]">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="price_range" className="w-4 h-4 accent-[#0B2419] cursor-pointer" />
                    <span className="text-[#191c19]">Dưới 500.000₫</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="price_range" defaultChecked className="w-4 h-4 accent-[#0B2419] cursor-pointer" />
                    <span className="text-[#101310] font-bold">500.000₫ - 1.000.000₫</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="price_range" className="w-4 h-4 accent-[#0B2419] cursor-pointer" />
                    <span className="text-[#191c19]">1.000.000₫ - 2.000.000₫</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="price_range" className="w-4 h-4 accent-[#0B2419] cursor-pointer" />
                    <span className="text-[#191c19]">Trên 2.000.000₫</span>
                  </label>
                </div>
                {/* 2 Custom Input Fields */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="text-[9px] uppercase font-bold text-[#625f4e] block pb-0.5">Giá từ:</span>
                      <input
                        type="text"
                        value={priceFrom}
                        onChange={(e) => setPriceFrom(e.target.value)}
                        className="w-full bg-[#f3f4ef] px-2 py-1.5 text-[12px] font-bold text-[#101310] outline-none border border-[#E8E9E3] focus:border-[#0B2419]"
                      />
                    </div>
                    <span className="text-[#687069] text-[14px] pt-4">-</span>
                    <div className="relative flex-1">
                      <span className="text-[9px] uppercase font-bold text-[#625f4e] block pb-0.5">Giá đến:</span>
                      <input
                        type="text"
                        value={priceTo}
                        onChange={(e) => setPriceTo(e.target.value)}
                        className="w-full bg-[#f3f4ef] px-2 py-1.5 text-[12px] font-bold text-[#101310] outline-none border border-[#E8E9E3] focus:border-[#0B2419]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full bg-[#FAF4DF] text-[#0B2419] border border-[#E8C75B] py-1.5 text-[11px] uppercase font-bold hover:bg-[#0B2419] hover:text-white transition-colors"
                  >
                    Lọc Giá
                  </button>
                </div>
              </div>

              {/* Filter Group: Size */}
              <div className="space-y-1.5 pt-1 border-b border-[#E8E9E3] pb-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[14px] text-[#071810] uppercase tracking-wider font-bold">Kích Thước</h3>
                  <button
                    onClick={() => {
                      setSelectedProductId('prod-1');
                      setCurrentScreen('product-detail');
                    }}
                    className="text-[10px] text-[#625f4e] hover:text-[#0B2419] uppercase underline"
                  >
                    Bảng size chuẩn
                  </button>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Hệ Chữ (Ready-to-wear):</p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`py-1.5 text-[12px] font-bold border transition-colors ${
                        selectedSize === sz
                          ? 'bg-[#0B2419] text-[#E8C75B] border-[#0B2419]'
                          : 'bg-[#f3f4ef] text-[#191c19] hover:bg-[#FAF4DF] border-[#E8E9E3]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] uppercase tracking-wider text-[#687069] font-bold pt-1">
                  Hệ Số (Quần Jean / Quần Tây):
                </p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[28, 29, 30, 31, 32, 33, 34].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`py-1.5 text-[12px] font-bold border transition-colors ${
                        selectedSize === sz || selectedSize === String(sz)
                          ? 'bg-[#0B2419] text-[#E8C75B] border-[#0B2419]'
                          : 'bg-[#f3f4ef] text-[#191c19] hover:bg-[#FAF4DF] border-[#E8E9E3]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Group: Colors */}
              <div className="space-y-1.5 pt-1 border-b border-[#E8E9E3] pb-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[14px] text-[#071810] uppercase tracking-wider font-bold">Màu Sắc</h3>
                  <span className="material-symbols-outlined text-[18px] text-[#625f4e]">expand_less</span>
                </div>
                <div className="space-y-2 text-[13px]">
                  {[
                    { name: 'Chàm Indigo Đậm', hex: '#1a2b49', active: true },
                    { name: 'Xanh Rừng Sâu Forest Green', hex: '#0b2419' },
                    { name: 'Trắng Kem Ecru', hex: '#f5f2eb' },
                    { name: 'Đen Than Charcoal', hex: '#1c1e21' },
                    { name: 'Nâu Da Bò Camel', hex: '#a86f3b' },
                    { name: 'Xám Khói Smoke', hex: '#5c636a' }
                  ].map((color) => (
                    <label key={color.name} className="flex items-center gap-3 cursor-pointer group">
                      <span
                        className="w-5 h-5 rounded-full border border-black/20 shadow-sm flex items-center justify-center text-white"
                        style={{ backgroundColor: color.hex }}
                      >
                        {color.active && <span className="material-symbols-outlined text-[13px]">check</span>}
                      </span>
                      <span className={`group-hover:text-[#1B5038] ${color.active ? 'text-[#101310] font-bold' : 'text-[#191c19]'}`}>
                        {color.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })}
                  className="w-full bg-[#0B2419] text-[#E8C75B] py-3 text-[12px] uppercase tracking-widest hover:bg-[#123A29] transition-colors font-bold shadow-sm"
                >
                  Áp Dụng Bộ Lọc
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full bg-[#f3f4ef] text-[#424844] py-2.5 text-[11px] uppercase tracking-wider hover:bg-[#FAF4DF] transition-colors border border-[#E8E9E3]"
                >
                  Thiết Lập Lại Mặc Định
                </button>
              </div>
            </aside>
          )}

          {/* KHỐI C — KẾT QUẢ SẢN PHẨM (Grid + Controller) */}
          <section className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Controller Bar */}
            <div className="w-full bg-[#FFFDF5] border border-[#E8E9E3] p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              {/* Left: Toggle & Counter */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E9E3] text-[#0B2419] text-[12px] uppercase tracking-wider font-semibold hover:bg-[#FAF4DF] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>{isSidebarVisible ? 'Thu Gọn Bộ Lọc' : 'Mở Rộng Bộ Lọc'}</span>
                </button>
                <span className="text-[13px] text-[#424844]">
                  Hiển thị <span className="font-bold text-[#071810]">1 - {displayedProducts.length}</span> trên{' '}
                  <span className="font-bold text-[#071810]">124</span> sản phẩm
                </span>
              </div>

              {/* Right: Sort & Grid View Switcher */}
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-2">
                  <label htmlFor="catalogSort" className="hidden sm:inline text-[11px] uppercase tracking-wider text-[#625f4e] font-bold">
                    Sắp xếp:
                  </label>
                  <div className="relative">
                    <select
                      id="catalogSort"
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as any)}
                      className="appearance-none bg-white border border-[#E8E9E3] text-[#191c19] px-3 py-1.5 pr-8 text-[12px] font-semibold tracking-wide uppercase focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="price-asc">Giá tăng dần</option>
                      <option value="price-desc">Giá giảm dần</option>
                      <option value="bestseller">Bán chạy nhất</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[18px] text-[#625f4e]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Grid Switcher */}
                <div className="hidden md:flex items-center border border-[#E8E9E3] bg-white p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setColumnsCount(3)}
                    title="Hiển thị 3 cột"
                    className={`p-1.5 transition-colors ${
                      columnsCount === 3 ? 'bg-[#0B2419] text-[#E8C75B]' : 'text-[#424844] hover:text-[#0B2419]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">view_module</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumnsCount(4)}
                    title="Hiển thị 4 cột"
                    className={`p-1.5 transition-colors ${
                      columnsCount === 4 ? 'bg-[#0B2419] text-[#E8C75B]' : 'text-[#424844] hover:text-[#0B2419]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Applied Filter Badges Summary Row */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
              <span className="text-[#625f4e] uppercase tracking-wider">Đang chọn:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF4DF] text-[#0B2419] border border-[#E8C75B]/40">
                Quần Jean <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF4DF] text-[#0B2419] border border-[#E8C75B]/40">
                Màu Indigo <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF4DF] text-[#0B2419] border border-[#E8C75B]/40">
                Size 31 <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span>
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#725c00] uppercase underline font-bold ml-2 hover:text-[#0B2419]"
              >
                Xóa tất cả
              </button>
            </div>

            {/* Products Grid */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${
                columnsCount === 3
                  ? 'md:grid-cols-3'
                  : isSidebarVisible
                  ? 'md:grid-cols-3 xl:grid-cols-4'
                  : 'md:grid-cols-4 xl:grid-cols-5'
              }`}
            >
              {displayedProducts.map((product) => {
                const isFavorite = wishlist.includes(product.id);
                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col bg-white border border-[#E8E9E3] hover:border-[#0B2419] transition-all duration-300"
                  >
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#f3f4ef]">
                      <div onClick={() => handleOpenProduct(product.id)} className="w-full h-full cursor-pointer">
                        <img
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          src={product.imageUrl}
                        />
                      </div>

                      {/* Status Badges */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                        {product.statusBadge && (
                          <span className="px-2 py-0.5 bg-[#0B2419] text-[#E8C75B] text-[9px] font-bold uppercase tracking-wider">
                            {product.statusBadge}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-white text-[#071A12] text-[9px] font-bold uppercase tracking-wider border border-[#E8E9E3]">
                          ĐANG BÁN
                        </span>
                      </div>

                      {/* Wishlist Button */}
                      <button
                        type="button"
                        aria-label="Thêm vào yêu thích"
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#0B2419] hover:text-[#ba1a1a] transition-colors shadow-sm z-10 cursor-pointer"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${isFavorite ? 'text-[#ba1a1a]' : ''}`}>
                          favorite
                        </span>
                      </button>

                      {/* Quick Size Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col gap-1.5 z-10">
                        <span className="text-[10px] uppercase tracking-wider text-[#625f4e] font-bold text-center">
                          Chi tiết / Chọn size nhanh
                        </span>
                        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold">
                          {product.sizes.slice(0, 5).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => addToCart(product, sz)}
                              className="w-7 h-7 flex items-center justify-center bg-[#f3f4ef] hover:bg-[#0B2419] hover:text-white transition-colors cursor-pointer"
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] text-[#625f4e] uppercase font-semibold">
                        <span>{product.category}</span>
                        <span className="font-bold text-[#0B2419] truncate ml-1">{product.brand}</span>
                      </div>
                      <h3
                        onClick={() => handleOpenProduct(product.id)}
                        className="text-[14px] text-[#101310] font-bold leading-snug group-hover:text-[#1B5038] transition-colors line-clamp-1 cursor-pointer"
                      >
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 py-0.5">
                        {product.colors.map((c) => (
                          <span
                            key={c.name}
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          ></span>
                        ))}
                      </div>
                      <div className="flex items-baseline gap-2 pt-1 border-t border-[#E8E9E3]/60">
                        <span className="text-[15px] font-bold text-[#0B2419] font-mono">
                          {((product.price as number) || 0).toLocaleString('vi-VN')}₫
                        </span>
                        {product.originalPrice && (
                          <span className="text-[12px] text-[#687069] line-through font-mono">
                            {product.originalPrice.toLocaleString('vi-VN')}₫
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* KHỐI D — PHÂN TRANG (Pagination Metadata) */}
            <div className="w-full bg-[#FFFDF5] border border-[#E8E9E3] p-4 mt-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-col text-center md:text-left">
                <span className="text-[14px] text-[#071A12] font-bold">
                  Hiển thị trang 1 / 13 (Tổng cộng 124 sản phẩm)
                </span>
                <span className="text-[12px] text-[#687069]">
                  Hệ thống may sẵn Atelier Vert — Cập nhật hàng ngày theo thời gian thực
                </span>
              </div>
              <div className="flex items-center gap-1 text-[12px] font-semibold">
                <button
                  type="button"
                  disabled
                  className="px-3 py-2 bg-[#f3f4ef] text-[#687069] border border-[#E8E9E3] cursor-not-allowed flex items-center gap-1 opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  <span>Trước</span>
                </button>
                <button
                  type="button"
                  className="w-9 h-9 bg-[#0B2419] text-[#E8C75B] font-bold flex items-center justify-center border border-[#0B2419] shadow-sm"
                >
                  1
                </button>
                <button
                  type="button"
                  className="w-9 h-9 bg-white hover:bg-[#FAF4DF] text-[#101310] flex items-center justify-center border border-[#E8E9E3] transition-colors"
                >
                  2
                </button>
                <button
                  type="button"
                  className="w-9 h-9 bg-white hover:bg-[#FAF4DF] text-[#101310] flex items-center justify-center border border-[#E8E9E3] transition-colors"
                >
                  3
                </button>
                <button
                  type="button"
                  className="w-9 h-9 bg-white hover:bg-[#FAF4DF] text-[#101310] flex items-center justify-center border border-[#E8E9E3] transition-colors"
                >
                  4
                </button>
                <span className="w-6 text-center text-[#687069] font-bold">...</span>
                <button
                  type="button"
                  className="w-9 h-9 bg-white hover:bg-[#FAF4DF] text-[#101310] flex items-center justify-center border border-[#E8E9E3] transition-colors"
                >
                  13
                </button>
                <button
                  type="button"
                  className="px-3 py-2 bg-white hover:bg-[#FAF4DF] text-[#0B2419] font-bold border border-[#E8E9E3] flex items-center gap-1 transition-colors"
                >
                  <span>Sau</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Editorial Brand Commitment Section */}
      <section className="w-full bg-[#FAF4DF] py-10 px-4 sm:px-8 lg:px-14 mt-10 border-t border-[#E8E9E3]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4 p-4 bg-white border border-[#E8E9E3]">
              <span className="material-symbols-outlined text-[#0B2419] text-[28px] p-2 bg-[#FFFDF5]">bolt</span>
              <div className="space-y-1">
                <h4 className="text-[14px] text-[#071A12] uppercase tracking-wide font-bold">Giao Hỏa Tốc 2H</h4>
                <p className="text-[12px] text-[#424844] leading-relaxed">
                  Nội thành nhận ngay trong 2 giờ, kiện hàng đóng hộp quà sang trọng kèm thẻ bảo hành.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white border border-[#E8E9E3]">
              <span className="material-symbols-outlined text-[#0B2419] text-[28px] p-2 bg-[#FFFDF5]">inventory_2</span>
              <div className="space-y-1">
                <h4 className="text-[14px] text-[#071A12] uppercase tracking-wide font-bold">Đồng Kiểm &amp; Thử Đồ COD</h4>
                <p className="text-[12px] text-[#424844] leading-relaxed">
                  Quý khách hoàn toàn an tâm thử đồ và kiểm tra chất vải cùng bưu tá trước khi thanh toán.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white border border-[#E8E9E3]">
              <span className="material-symbols-outlined text-[#0B2419] text-[28px] p-2 bg-[#FFFDF5]">content_cut</span>
              <div className="space-y-1">
                <h4 className="text-[14px] text-[#071A12] uppercase tracking-wide font-bold">Lên Gấu Quần Miễn Phí</h4>
                <p className="text-[12px] text-[#424844] leading-relaxed">
                  Hỗ trợ lên gấu quần lấy ngay 15 phút tại hệ thống showroom bằng chỉ may tiêu chuẩn gốc.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-white border border-[#E8E9E3]">
              <span className="material-symbols-outlined text-[#0B2419] text-[28px] p-2 bg-[#FFFDF5]">published_with_changes</span>
              <div className="space-y-1">
                <h4 className="text-[14px] text-[#071A12] uppercase tracking-wide font-bold">Đổi Size Tận Nơi 15 Ngày</h4>
                <p className="text-[12px] text-[#424844] leading-relaxed">
                  Đổi kích cỡ tận nhà hoàn toàn miễn phí, nhân viên giao nhận mang size mới đến tận cửa nhà.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
