import React, { useState } from 'react';

export const AdminCatalogMetaView: React.FC<{
  initialTab?: 'categories' | 'brands' | 'sizes' | 'colors';
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ initialTab = 'categories', onNavigateTab, showToast }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'sizes' | 'colors'>(initialTab);

  // Category form state
  const [catName, setCatName] = useState('');
  const [catParent, setCatParent] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);

  // Brand form state
  const [brandName, setBrandName] = useState('');
  const [brandOrigin, setBrandOrigin] = useState('');
  const [brandNote, setBrandNote] = useState('');

  // Color form state
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#0B2419');

  // Categories list
  const [categories, setCategories] = useState([
    { id: 10, name: 'Áo (Tops & Shirts)', parent: '', isRoot: true, count: 142 },
    { id: 101, name: 'Áo thun (T-Shirts & Polos)', parent: 'Áo (#10)', isRoot: false, count: 48 },
    { id: 102, name: 'Áo sơ mi thủ công (Handmade Shirts)', parent: 'Áo (#10)', isRoot: false, count: 94 },
    { id: 20, name: 'Quần (Trousers & Denim)', parent: '', isRoot: true, count: 118 },
    { id: 201, name: 'Quần jeans selvedge', parent: 'Quần (#20)', isRoot: false, count: 45 },
    { id: 202, name: 'Quần âu xếp ly (Pleated Trousers)', parent: 'Quần (#20)', isRoot: false, count: 52 },
    { id: 203, name: 'Quần short linen & cotton', parent: 'Quần (#20)', isRoot: false, count: 21 },
    { id: 30, name: 'Áo khoác & Blazer (Outerwear)', parent: '', isRoot: true, count: 65 },
    { id: 301, name: 'Blazer may sẵn (Tailored Blazers)', parent: 'Áo khoác & Blazer (#30)', isRoot: false, count: 36 },
  ]);

  // Brands list
  const [brands, setBrands] = useState([
    { id: 501, name: 'Kurabo Mills Japan', origin: 'Nhật Bản • Selvedge Denim 14oz', city: 'Kojima, Okayama', models: 28 },
    { id: 502, name: 'Albini Group Italy', origin: 'Ý • Lụa & Cotton Ai Cập 120/2', city: 'Albino, Bergamo', models: 42 },
    { id: 503, name: 'Loro Piana Heritage Wool', origin: 'Ý • Cashmere & Super 150s Merino', city: 'Quarona, Vercelli', models: 19 },
    { id: 504, name: 'Canclini 1925', origin: 'Ý • Flannel & Fine Shirting', city: 'Guanzate, Como', models: 31 },
    { id: 505, name: 'Atelier Vert Handcrafted', origin: 'Việt Nam • Thủ Công Sartorial Bản Địa', city: 'Saigon Tailoring Atelier', models: 85 },
  ]);

  // Colors list
  const [colors, setColors] = useState([
    { id: 101, name: 'Chàm Indigo Đậm (Deep Indigo)', hex: '#1C2841', skus: 68 },
    { id: 102, name: 'Xanh Rừng Sâu (Forest Green Signature)', hex: '#2D4B3E', skus: 84 },
    { id: 103, name: 'Kem Ecru Tự Nhiên (Raw Ecru Cotton)', hex: '#EBE7DF', skus: 52 },
    { id: 104, name: 'Đen Nero Mộc (Matte Black)', hex: '#1F2022', skus: 112 },
    { id: 105, name: 'Xám Khói Cuban (Cuban Smoke Grey)', hex: '#8C7D70', skus: 35 },
  ]);

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCatId) {
      setCategories(
        categories.map((c) =>
          c.id === editingCatId ? { ...c, name: catName, parent: catParent ? `ID ${catParent}` : '' } : c
        )
      );
      showToast(`Cập nhật danh mục thành công: ${catName}`);
      setEditingCatId(null);
    } else {
      const newId = Date.now() % 1000;
      setCategories([
        ...categories,
        { id: newId, name: catName, parent: catParent ? `ID ${catParent}` : '', isRoot: !catParent, count: 0 },
      ]);
      showToast(`Tạo danh mục mới thành công: ${catName}`);
    }
    setCatName('');
    setCatParent('');
  };

  const handleBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    const newId = 500 + brands.length + 1;
    setBrands([
      ...brands,
      {
        id: newId,
        name: brandName,
        origin: brandOrigin || 'Quốc tế • Tiêu chuẩn cao cấp',
        city: 'Xưởng dệt hợp tác',
        models: 0,
      },
    ]);
    showToast(`Thêm thương hiệu mới thành công: ${brandName}`);
    setBrandName('');
    setBrandOrigin('');
    setBrandNote('');
  };

  const handleColorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorName.trim()) return;
    const newId = 100 + colors.length + 1;
    setColors([
      ...colors,
      { id: newId, name: colorName, hex: colorHex, skus: 0 },
    ]);
    showToast(`Thêm mã màu mới thành công: ${colorName} (${colorHex})`);
    setColorName('');
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#687069] mb-1.5">
            <span>Hệ thống Quản trị</span>
            <span>/</span>
            <span>Sản phẩm &amp; Catalog</span>
            <span>/</span>
            <span className="text-[#1B5038] font-semibold">Danh mục &amp; Thuộc tính</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl text-[#101310] font-bold tracking-tight">
              QUẢN LÝ DANH MỤC / THƯƠNG HIỆU / HỆ SIZE / MÀU SẮC
            </h1>
            <span className="inline-flex items-center gap-1.5 bg-[#0B2419] text-white px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5C358]"></span>
              Dữ Liệu Catalog Chuẩn
            </span>
          </div>
          <p className="text-xs text-[#687069] mt-1">
            Quản lý dữ liệu tham chiếu nền tảng phục vụ cấu hình sản phẩm và biến thể SKUs.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded bg-white shadow-xs border border-[#E8E9E3] flex items-center gap-2.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1B5038] animate-pulse"></div>
            <div>
              <p className="text-[10px] font-bold text-[#687069] uppercase">Đồng Bộ Hệ Thống</p>
              <p className="text-xs font-bold text-[#101310]">Đã Đồng Bộ Mới Nhất</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => showToast('Dữ liệu Master Catalog Metadata đã được đồng bộ mới nhất.')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0B2419] hover:bg-[#FAF4DF] rounded text-xs font-bold uppercase tracking-wider shadow-xs border border-[#E8E9E3] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Làm mới Dữ Liệu
          </button>
        </div>
      </div>

      {/* Metric Tiles Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white shadow-xs border border-[#E8E9E3] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Danh mục hoạt động</p>
            <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-0.5">
              {categories.length}{' '}
              <span className="font-sans text-xs text-[#687069] font-normal">
                (3 Root / {categories.length - 3} Sub)
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#0B2419]/5 flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[22px]">account_tree</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white shadow-xs border border-[#E8E9E3] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Thương hiệu / Xưởng</p>
            <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-0.5">
              {brands.length}{' '}
              <span className="font-sans text-xs text-[#687069] font-normal">Quốc tế &amp; Thủ công</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#0B2419]/5 flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[22px]">factory</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white shadow-xs border border-[#E8E9E3] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Hệ thống kích cỡ</p>
            <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-0.5">
              5 <span className="font-sans text-xs text-[#687069] font-normal">Hệ (42 Size Values)</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#0B2419]/5 flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[22px]">straighten</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white shadow-xs border border-[#E8E9E3] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Bảng màu tiêu chuẩn</p>
            <p className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-0.5">
              {colors.length} <span className="font-sans text-xs text-[#687069] font-normal">Mã Pantone / Hex</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#0B2419]/5 flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[22px]">palette</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Controller */}
      <div className="bg-white p-1.5 rounded-lg shadow-xs border border-[#E8E9E3] flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-bold transition-all ${
            activeTab === 'categories'
              ? 'bg-[#0B2419] text-white shadow-xs'
              : 'text-[#191c19] hover:bg-[#f3f4ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">folder_special</span>
          <span>1. DANH MỤC (Categories)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('brands')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-bold transition-all ${
            activeTab === 'brands'
              ? 'bg-[#0B2419] text-white shadow-xs'
              : 'text-[#191c19] hover:bg-[#f3f4ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>2. THƯƠNG HIỆU / XƯỞNG DỆT (Brands)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sizes')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-bold transition-all ${
            activeTab === 'sizes'
              ? 'bg-[#0B2419] text-white shadow-xs'
              : 'text-[#191c19] hover:bg-[#f3f4ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">straighten</span>
          <span>3. HỆ KÍCH CỠ (Sizes)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colors')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-bold transition-all ${
            activeTab === 'colors'
              ? 'bg-[#0B2419] text-white shadow-xs'
              : 'text-[#191c19] hover:bg-[#f3f4ef]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">palette</span>
          <span>4. BẢNG MÀU SẮC (Color Swatches)</span>
        </button>
      </div>

      {/* TAB CONTENT 1: DANH MỤC */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Create/Edit Category */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-[#E8E9E3]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3]">
                <div>
                  <p className="text-[10px] font-bold text-[#1B5038] uppercase tracking-wider">
                    Thiết lập phân cấp
                  </p>
                  <h2 className="font-bold text-base text-[#101310]">Quản lý Danh mục</h2>
                </div>
                <span className="material-symbols-outlined text-[#0B2419] bg-[#f3f4ef] p-2 rounded">
                  format_list_bulleted_add
                </span>
              </div>

              <form onSubmit={handleCategorySubmit} className="space-y-4 pt-3 text-xs">
                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Tên danh mục <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vd: Áo sơ mi lụa, Quần jeans selvedge..."
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-[#f3f4ef] px-3.5 py-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:bg-white focus:border-[#0B2419]"
                  />
                  <p className="text-[10px] text-[#687069] mt-1">Tên hiển thị của danh mục trên storefront</p>
                </div>

                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Danh mục cha (Parent Category)
                  </label>
                  <select
                    value={catParent}
                    onChange={(e) => setCatParent(e.target.value)}
                    className="w-full bg-[#f3f4ef] px-3.5 py-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:bg-white"
                  >
                    <option value="">-- Là Danh mục Gốc (Root Level / Không cha) --</option>
                    <option value="10">[ID 10] Áo (Tops &amp; Shirts)</option>
                    <option value="20">[ID 20] Quần (Trousers &amp; Denim)</option>
                    <option value="30">[ID 30] Áo khoác &amp; Blazer (Outerwear)</option>
                  </select>
                  <p className="text-[10px] text-[#687069] mt-1">Chọn cấp cha tương ứng hoặc để trống nếu là gốc</p>
                </div>

                <div className="p-3 bg-[#f3f4ef] rounded text-[#687069] border border-[#E8E9E3] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B2419]">
                    <span>Chế độ:</span>
                    <span className="bg-white px-2 py-0.5 rounded shadow-xs">
                      {editingCatId ? `CẬP NHẬT (#${editingCatId})` : 'TẠO MỚI'}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Khi danh mục có sản phẩm liên kết, hệ thống sẽ yêu cầu chuyển danh mục cho các sản phẩm tồn tại trước khi xóa.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#0B2419] hover:bg-[#1B5038] text-white font-bold text-xs py-2.5 px-4 rounded tracking-wide transition-colors flex items-center justify-center gap-1.5 shadow-xs uppercase"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>{editingCatId ? 'Cập Nhật Danh Mục' : 'Tạo Danh Mục Mới'}</span>
                  </button>
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                        setCatParent('');
                      }}
                      className="bg-[#f3f4ef] text-[#687069] font-bold text-xs py-2.5 px-3 rounded"
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Category Tree Table */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-[#FAF9F5] border-b border-[#E8E9E3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419]">account_tree</span>
                <h3 className="font-bold text-sm text-[#101310]">Cấu trúc Cây Danh mục Sản phẩm</h3>
              </div>
              <span className="text-xs text-[#687069]">Hiển thị {categories.length} danh mục</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#191c19]">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                    <th className="py-3 px-4 w-16">ID</th>
                    <th className="py-3 px-4">Tên danh mục / Cấp phân nhánh</th>
                    <th className="py-3 px-4">Danh mục cha</th>
                    <th className="py-3 px-4 text-center">Số SKU / SP</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3]">
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className={`hover:bg-[#FAF4DF]/40 transition-colors ${
                        cat.isRoot ? 'bg-[#FAF9F5]/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0B2419]">#{cat.id}</td>
                      <td className={`py-2.5 px-4 ${cat.isRoot ? '' : 'pl-8'}`}>
                        <div className="flex items-center gap-2">
                          {!cat.isRoot && <span className="text-[#687069]">└─</span>}
                          <span className="material-symbols-outlined text-[16px] text-[#687069]">
                            {cat.isRoot ? 'folder' : 'subdirectory_arrow_right'}
                          </span>
                          <span className={cat.isRoot ? 'text-[#0B2419] font-bold' : ''}>{cat.name}</span>
                          {cat.isRoot && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#0B2419]/10 text-[#0B2419] font-bold">
                              ROOT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#687069]">
                        {cat.parent || <span className="italic text-[#A3AAA5]">— Không có (Gốc)</span>}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#0B2419]">{cat.count} SP</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setCatName(cat.name);
                            showToast(`Đang chỉnh sửa danh mục #${cat.id}`);
                          }}
                          className="p-1 text-[#687069] hover:text-[#0B2419] rounded mr-1"
                          title="Sửa"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCategories(categories.filter((c) => c.id !== cat.id));
                            showToast(`Đã xóa danh mục #${cat.id}`);
                          }}
                          className="p-1 text-[#687069] hover:text-[#ba1a1a] rounded"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: THƯƠNG HIỆU / XƯỞNG DỆT */}
      {activeTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Create Brand */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-[#E8E9E3]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3]">
                <div>
                  <h2 className="font-bold text-base text-[#101310]">Thêm Thương Hiệu / Xưởng Dệt</h2>
                  <p className="text-[10px] text-[#687069]">Quản lý đối tác dệt may cao cấp</p>
                </div>
                <span className="material-symbols-outlined text-[#0B2419] bg-[#f3f4ef] p-2 rounded">factory</span>
              </div>
              <form onSubmit={handleBrandSubmit} className="space-y-4 pt-3 text-xs">
                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Tên thương hiệu / Nhà xưởng <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vd: Kurabo Mills Japan, Albini Group..."
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-[#f3f4ef] px-3.5 py-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:bg-white focus:border-[#0B2419]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Quốc gia / Xuất xứ di sản
                  </label>
                  <input
                    type="text"
                    placeholder="Nhật Bản • Selvedge Denim, Ý..."
                    value={brandOrigin}
                    onChange={(e) => setBrandOrigin(e.target.value)}
                    className="w-full bg-[#f3f4ef] px-3.5 py-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:bg-white focus:border-[#0B2419]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Đặc tả kỹ thuật dệt / Chứng nhận vải
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Vd: Tiêu chuẩn Selvedge Shuttle Loom Kojima, 100% Giza Cotton..."
                    value={brandNote}
                    onChange={(e) => setBrandNote(e.target.value)}
                    className="w-full bg-[#f3f4ef] px-3.5 py-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:bg-white focus:border-[#0B2419]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#0B2419] hover:bg-[#1B5038] text-white font-bold text-xs py-2.5 px-4 rounded tracking-wide transition-colors flex items-center justify-center gap-2 shadow-xs uppercase"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Thêm Thương Hiệu
                </button>
              </form>
            </div>
          </div>

          {/* Brands List */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-[#FAF9F5] border-b border-[#E8E9E3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419]">workspace_premium</span>
                <h3 className="font-bold text-sm text-[#101310]">Danh Sách Đối Tác &amp; Nhà Xưởng</h3>
              </div>
              <span className="text-xs text-[#687069] font-medium">{brands.length} thương hiệu chính</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#191c19]">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                    <th className="py-3 px-4 w-16">ID</th>
                    <th className="py-3 px-4">Tên thương hiệu / Nhà xưởng</th>
                    <th className="py-3 px-4">Xuất xứ &amp; Tiêu chuẩn</th>
                    <th className="py-3 px-4 text-center">Dòng SP</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3]">
                  {brands.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF4DF]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0B2419]">#{b.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-[#101310]">{b.name}</p>
                        <p className="text-[11px] text-[#687069]">{b.city}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#f3f4ef] text-[#0B2419] font-semibold border border-[#E8E9E3]">
                          {b.origin}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#0B2419]">{b.models} mẫu</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => showToast(`Chỉnh sửa thương hiệu ${b.name}`)}
                          className="p-1 text-[#687069] hover:text-[#0B2419] rounded mr-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBrands(brands.filter((item) => item.id !== b.id));
                            showToast(`Đã xóa đối tác #${b.id}`);
                          }}
                          className="p-1 text-[#687069] hover:text-[#ba1a1a] rounded"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: HỆ KÍCH CỠ */}
      {activeTab === 'sizes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System 1 */}
            <div className="bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
              <div className="p-4 bg-[#FAF9F5] border-b border-[#E8E9E3] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded bg-[#0B2419] text-[#E5C358] font-bold text-xs flex items-center justify-center">
                    S1
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[#101310]">Áo người lớn (Tops &amp; Shirts)</h3>
                    <p className="text-[11px] text-[#687069]">Áp dụng cho: Áo thun, Sơ mi, Len dệt kim</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f3f4ef] text-[#0B2419] font-mono">
                  SS-TOPS-02
                </span>
              </div>
              <div className="p-4 flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#687069] text-[10px] uppercase font-bold bg-[#FAF9F5] border-b border-[#E8E9E3]">
                    <tr>
                      <th className="py-2 px-3">Mã Size</th>
                      <th className="py-2 px-3">Tên hiển thị</th>
                      <th className="py-2 px-3 text-center">Thứ tự</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E9E3]">
                    {[
                      { code: 'S', name: 'Small (Ngực 88 - 92 cm)', order: 1 },
                      { code: 'M', name: 'Medium (Ngực 92 - 96 cm)', order: 2 },
                      { code: 'L', name: 'Large (Ngực 96 - 102 cm)', order: 3 },
                      { code: 'XL', name: 'Extra Large (Ngực 102 - 108 cm)', order: 4 },
                      { code: 'XXL', name: 'Double Extra Large (108 - 114 cm)', order: 5 },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#f8faf4]">
                        <td className="py-2.5 px-3 font-bold text-[#0B2419]">{row.code}</td>
                        <td className="py-2.5 px-3 text-[#101310]">{row.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#687069]">{row.order}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System 2 */}
            <div className="bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
              <div className="p-4 bg-[#FAF9F5] border-b border-[#E8E9E3] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded bg-[#0B2419] text-[#E5C358] font-bold text-xs flex items-center justify-center">
                    S2
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-[#101310]">Quần Jeans Nam (Waist Standard)</h3>
                    <p className="text-[11px] text-[#687069]">Áp dụng cho: Selvedge Jeans, Raw Denim</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f3f4ef] text-[#0B2419] font-mono">
                  SS-JEANS-01
                </span>
              </div>
              <div className="p-4 flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="text-[#687069] text-[10px] uppercase font-bold bg-[#FAF9F5] border-b border-[#E8E9E3]">
                    <tr>
                      <th className="py-2 px-3">Mã Size</th>
                      <th className="py-2 px-3">Tên hiển thị</th>
                      <th className="py-2 px-3 text-center">Thứ tự</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E9E3]">
                    {[
                      { code: '28', name: '28 Inch (Vòng eo 74-76cm)', order: 1 },
                      { code: '29', name: '29 Inch (Vòng eo 76-78cm)', order: 2 },
                      { code: '30', name: '30 Inch (Vòng eo 78-81cm)', order: 3 },
                      { code: '31', name: '31 Inch (Vòng eo 81-83cm)', order: 4 },
                      { code: '32', name: '32 Inch (Vòng eo 83-86cm)', order: 5 },
                      { code: '34', name: '34 Inch (Vòng eo 88-91cm)', order: 6 },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#f8faf4]">
                        <td className="py-2.5 px-3 font-bold text-[#0B2419]">{row.code}</td>
                        <td className="py-2.5 px-3 text-[#101310]">{row.name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#687069]">{row.order}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: BẢNG MÀU SẮC */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Add Color */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-lg shadow-sm border border-[#E8E9E3]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3]">
                <div>
                  <p className="text-[10px] font-bold text-[#1B5038] uppercase tracking-wider">
                    Bảng màu chuẩn
                  </p>
                  <h2 className="font-bold text-base text-[#101310]">Thêm Mã Màu Sắc Mới</h2>
                </div>
                <span className="material-symbols-outlined text-[#0B2419] bg-[#f3f4ef] p-2 rounded">palette</span>
              </div>
              <form onSubmit={handleColorSubmit} className="space-y-4 pt-3 text-xs">
                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Tên màu sắc (name) <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vd: Chàm Indigo Đậm, Xanh Rừng Sâu..."
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    className="w-full bg-[#f3f4ef] px-3.5 py-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:bg-white focus:border-[#0B2419]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                    Mã HEX / Pantone code <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-10 p-0 border-0 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      required
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="flex-1 bg-[#f3f4ef] px-3.5 py-2.5 rounded font-mono font-bold text-[#101310] border border-[#E8E9E3] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Preview Swatch */}
                <div className="p-3 bg-[#f3f4ef] rounded flex items-center gap-3 border border-[#E8E9E3]">
                  <div
                    className="w-10 h-10 rounded-full shadow-inner border border-white shrink-0"
                    style={{ backgroundColor: colorHex }}
                  ></div>
                  <div>
                    <p className="font-bold text-xs text-[#101310]">Xem trước Swatch tròn</p>
                    <p className="text-[10px] text-[#687069]">Hiển thị trong bộ lọc màu sắc và trang sản phẩm.</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0B2419] hover:bg-[#1B5038] text-white font-bold text-xs py-2.5 px-4 rounded tracking-wide transition-colors flex items-center justify-center gap-2 shadow-xs uppercase"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Thêm Màu Sắc
                </button>
              </form>
            </div>
          </div>

          {/* Color Swatches Grid & Table */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow-sm border border-[#E8E9E3] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E9E3] pb-3">
              <h3 className="font-bold text-sm text-[#101310] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419]">format_paint</span>
                Bảng Mã Màu Hiện Có
              </h3>
              <span className="text-xs text-[#0B2419] font-bold bg-[#FAF4DF] px-2.5 py-1 rounded">
                {colors.length} màu cốt lõi
              </span>
            </div>

            {/* Swatch Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {colors.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-[#f3f4ef] rounded-lg flex flex-col items-center text-center border border-[#E8E9E3] hover:bg-[#FAF4DF]/60 transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-full shadow-inner mb-2 ring-2 ring-white"
                    style={{ backgroundColor: c.hex }}
                  ></div>
                  <p className="font-bold text-[11px] text-[#101310] truncate w-full">{c.name.split(' ')[0]}</p>
                  <p className="font-mono text-[10px] text-[#687069]">{c.hex}</p>
                  <span className="mt-1 text-[9px] text-[#0B2419] font-bold bg-white px-1.5 py-0.5 rounded border border-[#E8E9E3]">
                    ID: #{c.id}
                  </span>
                </div>
              ))}
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs text-[#191c19]">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                    <th className="py-2.5 px-4 w-16">ID</th>
                    <th className="py-2.5 px-4">Mẫu Màu</th>
                    <th className="py-2.5 px-4">Tên màu (name)</th>
                    <th className="py-2.5 px-4">Mã Code (HEX)</th>
                    <th className="py-2.5 px-4 text-center">SKUs áp dụng</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3]">
                  {colors.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF4DF]/40">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0B2419]">#{c.id}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className="inline-block w-6 h-6 rounded-full shadow-xs border border-white align-middle"
                          style={{ backgroundColor: c.hex }}
                        ></span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#101310]">{c.name}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#687069]">{c.hex}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#0B2419]">{c.skus} SKUs</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setColors(colors.filter((item) => item.id !== c.id));
                            showToast(`Đã xóa mã màu #${c.id}`);
                          }}
                          className="p-1 text-[#687069] hover:text-[#ba1a1a] rounded"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
