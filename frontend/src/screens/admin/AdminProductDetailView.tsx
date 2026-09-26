import React, { useState } from 'react';

export const AdminProductDetailView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab, showToast }) => {
  const [productTitle, setProductTitle] = useState(
    'Quần Jean Straight Fit Dark Indigo Selvedge 13.5oz'
  );
  const [basePrice, setBasePrice] = useState('1.850.000');
  const [saleStatus, setSaleStatus] = useState<'ON_SALE' | 'DRAFT' | 'OFF_SHELF'>('ON_SALE');

  // Media gallery
  const [mediaList, setMediaList] = useState([
    {
      id: 'media-1',
      isPrimary: true,
      label: '01 / Cover',
      altText: 'Mặt trước toàn thân người mẫu mặc quần jean Indigo phối giày da',
      url: 'https://lh3.googleusercontent.com/aida/AEtjO1WHRcMrnuUTbkYBPh2OKYQsUSkqjEhPkk93kMFesyYDEsGBHVtevc2JUQ0gGErDYzfuHhGZN8JUAjS3VccWxmduD0Iggn157B9oBLoiRZYEJwa-mG51j57_1AymuRkElenVWeJX0auZY6kfYL2iv175jA9FZYYrldHVC0T1D6-p98V-WHqNjOEiJoBFtGEd2hgntyeH88MPjHS9FPwgtQxWcHloFlSggZJDTMcZfSv4aih9E1UeBkvUDW8',
    },
    {
      id: 'media-2',
      isPrimary: false,
      label: '02 / Secondary',
      altText: 'Góc chụp sau và phom đùi suông thẳng thớm phối boot da',
      url: 'https://lh3.googleusercontent.com/aida/AEtjO1VmUvdUdLhaiG5KonOOVDvROZ6_5yZdViucCicsHKsh19HuQ08GjQI_AORsxT_aQaCZBXHCWH8sylH29P7XYJZicZdR0_F4xox2lE_gcLVUyAdNvuw0RJez-WsCA-4kAIG6SZzisHjoPxAzqi385xidW1HXyebd2939XxqdoAmDgjQBGuceOHmUYxA7HeZ18UcGL5mrarIcoNTCvJEODdJOoGlQSZE5oyM-rW6E0SvyjM0lZ_SwNPHqORM9',
    },
    {
      id: 'media-3',
      isPrimary: false,
      label: '03 / Texture',
      altText: 'Cận cảnh biên đỏ Selvedge và đinh tán đồng Kurabo dập nổi',
      url: 'https://lh3.googleusercontent.com/aida/AEtjO1X9KOfLsPedv8TOje_WnY3fqHGwy51FfwT7DA0df8LdmsMhhWMguAX6LGm3jkx2D5h7BHFxmXtkuClGRHa3WUvjepcV14DxrhbnTqxrS3adi8SBKxkdD_-dXeNkAT836tMUMBANVHNZFPeUc-Q3vGMWtMdGJOcaTmYFvlx-bDK_evFoaj6aGKzuD6z3BLU21lv1J-fxf2XTc_jqW2d_QzAxbU4jGWKy7lB-Hz2yh_mXHxVy9SqnkhITVpue',
    },
  ]);

  // Quick add photo
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoAlt, setNewPhotoAlt] = useState('');

  // Variants list
  const [variants, setVariants] = useState([
    { size: 'Size 28', color: 'Chàm Indigo Đậm', hex: '#1A2740', sku: 'KMD-ST-IND-28', price: '1.850.000 ₫', inherit: true, status: 'ON_SALE', stock: '24 cái' },
    { size: 'Size 29', color: 'Chàm Indigo Đậm', hex: '#1A2740', sku: 'KMD-ST-IND-29', price: '1.850.000 ₫', inherit: true, status: 'ON_SALE', stock: '32 cái' },
    { size: 'Size 30', color: 'Chàm Indigo Đậm', hex: '#1A2740', sku: 'KMD-ST-IND-30', price: '1.850.000 ₫', inherit: true, status: 'ON_SALE', stock: '28 cái' },
    { size: 'Size 31', color: 'Chàm Indigo Đậm', hex: '#1A2740', sku: 'KMD-ST-IND-31', price: '1.850.000 ₫', inherit: true, status: 'ON_SALE', stock: '18 cái' },
    { size: 'Size 32', color: 'Chàm Indigo Đậm', hex: '#1A2740', sku: 'KMD-ST-IND-32', price: '1.950.000 ₫', inherit: false, status: 'ON_SALE', stock: '25 cái' },
    { size: 'Size 34', color: 'Chàm Indigo Đậm', hex: '#1A2740', sku: 'KMD-ST-IND-34', price: '1.950.000 ₫', inherit: false, status: 'ON_SALE', stock: '15 cái' },
  ]);

  // Form new variant
  const [newVarSize, setNewVarSize] = useState('SZ-33');
  const [newVarColor, setNewVarColor] = useState('COL-101');
  const [newVarSku, setNewVarSku] = useState('KMD-ST-IND-33');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStatus, setNewVarStatus] = useState('ON_SALE');

  const handleAddVariant = () => {
    const sizeName = newVarSize === 'SZ-33' ? 'Size 33' : newVarSize;
    const newV = {
      size: sizeName,
      color: 'Chàm Indigo Đậm',
      hex: '#1A2740',
      sku: newVarSku || 'KMD-ST-IND-NEW',
      price: newVarPrice ? `${newVarPrice} ₫` : '1.850.000 ₫',
      inherit: !newVarPrice,
      status: newVarStatus,
      stock: '0 cái (Mới)',
    };
    setVariants([...variants, newV]);
    showToast(`Đã thêm mới biến thể ${sizeName} (SKU: ${newV.sku}) vào hệ thống!`);
  };

  const handleAddMedia = () => {
    if (!newPhotoUrl.trim()) return;
    const newMedia = {
      id: `media-${Date.now()}`,
      isPrimary: false,
      label: `0${mediaList.length + 1} / Extra`,
      altText: newPhotoAlt || 'Hình ảnh sản phẩm Atelier Vert',
      url: newPhotoUrl.trim(),
    };
    setMediaList([...mediaList, newMedia]);
    setNewPhotoUrl('');
    setNewPhotoAlt('');
    showToast('Đã thêm hình ảnh mới vào thư viện Media Lookbook!');
  };

  const setPrimaryPhoto = (index: number) => {
    setMediaList(
      mediaList.map((m, i) => ({
        ...m,
        isPrimary: i === index,
      }))
    );
    showToast('Đã cập nhật ảnh đại diện chính (Cover Image)!');
  };

  return (
    <div className="flex flex-col w-full space-y-8 pb-12">
      {/* Top Navigation & Sticky Status Header */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#687069] text-xs">
              <span>Hệ thống Quản trị</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <button
                type="button"
                onClick={() => onNavigateTab('san-pham', 'Sản phẩm')}
                className="hover:text-[#0B2419] font-medium"
              >
                Sản phẩm &amp; Catalog
              </button>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#0B2419] font-bold">Chỉnh sửa sản phẩm</span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl text-[#0B2419] font-bold tracking-tight">
                Quản Trị &amp; Chỉnh Sửa Chi Tiết Sản Phẩm
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#687069] bg-[#edeee9] px-2 py-0.5 rounded font-mono">
                PRD-00102
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#424844]">
              Thiết lập thông tin catalog, thư viện ảnh đa góc nhìn và ma trận biến thể SKUs
            </p>
          </div>

          {/* Live Badges & Quick Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF4DF] text-[#101310] text-xs font-bold rounded border border-[#E5C358]/40">
              <span className="w-2 h-2 rounded-full bg-[#123A29]"></span>
              Đang chỉnh sửa: PRD-00102
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B2419] text-white text-xs font-bold rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5C358] animate-ping"></span>
              ON_SALE • Đang bán
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#edeee9] text-[#0B2419] text-xs font-bold rounded">
              <span className="material-symbols-outlined text-[15px]">tag</span>
              {variants.length} Biến thể liên kết
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 bg-[#f3f4ef] p-4 rounded border border-[#E8E9E3]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('san-pham', 'Sản phẩm')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#edeee9] text-[#0B2419] text-xs font-bold uppercase tracking-wider rounded shadow-xs border border-[#E8E9E3] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Hủy bỏ / Quay lại
            </button>
            <button
              type="button"
              onClick={() => showToast('Đang mở trang xem trước Storefront')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#edeee9] text-[#687069] hover:text-[#0B2419] text-xs font-bold uppercase tracking-wider rounded shadow-xs border border-[#E8E9E3] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              Xem trước trên Web
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => showToast('Mở form tạo sản phẩm mới')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#edeee9] text-[#0B2419] text-xs font-bold uppercase tracking-wider rounded shadow-xs border border-[#E8E9E3] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              Tạo Mới
            </button>
            <button
              type="button"
              onClick={() => showToast('Đã lưu thành công các thay đổi sản phẩm PRD-00102!')}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider rounded shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              LƯU THAY ĐỔI
            </button>
          </div>
        </div>
      </section>

      {/* Metric Strip */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Danh mục chính</p>
            <p className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419] mt-0.5">
              Quần Jean Nam
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[20px]">styler</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Giá niêm yết cơ bản</p>
            <p className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419] mt-0.5">
              {basePrice} ₫
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[20px]">payments</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Tổng tồn khả dụng</p>
            <p className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419] mt-0.5">
              142 chiếc
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center text-[#0B2419]">
            <span className="material-symbols-outlined text-[20px]">inventory</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Tỷ lệ xuất bán (30N)</p>
            <p className="font-['Playfair_Display',serif] text-lg font-bold text-[#1B5038] mt-0.5">
              +38.4%
            </p>
          </div>
          <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center text-[#1B5038]">
            <span className="material-symbols-outlined text-[20px]">trending_up</span>
          </div>
        </div>
      </section>

      {/* Khối A — Thông Tin Chung */}
      <section className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-[#E8E9E3] space-y-6">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#E8E9E3] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#123A29] rounded-full"></span>
              <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#0B2419] tracking-tight">
                Thông Tin Chung Sản Phẩm
              </h2>
            </div>
            <p className="text-xs text-[#424844] mt-1">
              Các trường cốt lõi phục vụ hiển thị trên hệ thống lọc Lookbook, trang chi tiết và đồng bộ Catalog Metadata.
            </p>
          </div>
          <span className="text-[10px] text-[#0B2419] bg-[#FAF4DF] px-2.5 py-1 rounded font-mono border border-[#E8E9E3]">
            Schema: ProductMaster_v2.2 • TreeSelect &amp; Metadata Enforced
          </span>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6 text-xs">
          {/* Row 1: Full Product Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider">
                Tên sản phẩm <span className="text-[#ba1a1a]">*</span>
              </label>
              <span className="text-[10px] text-[#687069]">Kiểu control: Text Input • slug tự sinh</span>
            </div>
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              className="w-full px-4 py-3 bg-[#f3f4ef] text-[#191c19] font-bold text-sm rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B2419] border border-[#E8E9E3]"
            />
            <p className="text-[11px] text-[#687069]">
              Độ dài khuyến nghị 40-70 ký tự để tối ưu hóa SEO và in nhãn đóng gói hộp quà Atelier Vert.
            </p>
          </div>

          {/* Row 2: Categorization */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Col 1: Danh Mục */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider">
                  Danh mục chính <span className="text-[#ba1a1a]">*</span>
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#FAF4DF] text-[#0B2419] rounded">
                  category_id: 102
                </span>
              </div>
              <div className="bg-white border border-[#E8E9E3] rounded shadow-xs overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#f3f4ef]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[18px] text-[#123A29]">account_tree</span>
                    <span className="font-semibold text-[#0B2419]">Quần &gt; Quần jeans (Selvedge)</span>
                  </div>
                  <span className="material-symbols-outlined text-[#0B2419] text-[18px]">expand_less</span>
                </div>
                <div className="p-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between py-1 px-2 rounded bg-[#0B2419] text-white font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#E5C358] font-bold">├─</span>
                      <span>Quần jeans (category_id: 102)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 py-1 px-2 rounded text-[#424844]">
                    <span className="text-[#687069]">└─</span>
                    <span>Quần short / Trousers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 2: Thương hiệu */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider">
                  Thương hiệu / Xưởng dệt <span className="text-[#ba1a1a]">*</span>
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#edeee9] text-[#687069] rounded">
                  brand_id: BRD-004
                </span>
              </div>
              <div className="bg-white border border-[#E8E9E3] rounded shadow-xs">
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#687069] text-[18px]">search</span>
                  <input
                    type="text"
                    defaultValue="Kurabo Mills Japan (Okayama Selvedge)"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f3f4ef] font-semibold text-[#0B2419] rounded focus:outline-none"
                  />
                </div>
                <div className="p-2 border-t border-[#E8E9E3] space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-[#FAF4DF] text-[#0B2419] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#123A29]">check_circle</span>
                      Kurabo Mills Japan (13.5oz Raw)
                    </span>
                    <span className="text-[10px] text-[#687069]">Okayama, JP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Hệ Quy Chiếu Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider">
                  Hệ quy chiếu Size <span className="text-[#ba1a1a]">*</span>
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#FAF4DF] text-[#0B2419] rounded">
                  size_system_id: SS-JEANS-01
                </span>
              </div>
              <select className="w-full px-3 py-2.5 bg-[#f3f4ef] text-[#0B2419] font-bold rounded border border-[#E8E9E3] focus:outline-none">
                <option value="SS-JEANS-01">Jeans Waist Standard (Size 28 - 34 Inch)</option>
                <option value="SS-MENS-PANTS">Size quần nam (Âu phục EU 44 - 52)</option>
                <option value="SS-ADULT-TOP">Size áo người lớn (S - M - L - XL - XXL)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Attributes & Price */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Giới tính mục tiêu
              </label>
              <select className="w-full px-3 py-2.5 bg-[#f3f4ef] text-[#0B2419] rounded border border-[#E8E9E3]">
                <option selected>Nam (Men)</option>
                <option>Nữ (Women)</option>
                <option>Unisex</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Mùa thời trang
              </label>
              <select className="w-full px-3 py-2.5 bg-[#f3f4ef] text-[#0B2419] rounded border border-[#E8E9E3]">
                <option selected>Thu Đông (All-Season Classic)</option>
                <option>Xuân Hè Capsule 2026</option>
                <option>Permanent Collection</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Phong cách / Fitting
              </label>
              <select className="w-full px-3 py-2.5 bg-[#f3f4ef] text-[#0B2419] rounded border border-[#E8E9E3]">
                <option selected>Sartorial Denim / Contemporary</option>
                <option>Workwear Heritage</option>
                <option>Casual Minimalist</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Giá cơ bản (₫) <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="text"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#FAF4DF] text-[#0B2419] font-bold text-sm rounded border border-[#E8E9E3]"
              />
            </div>
          </div>

          {/* Row 4: Status Toggle Selection */}
          <div className="p-4 bg-[#f3f4ef] rounded-lg space-y-2 border border-[#E8E9E3]">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider">
                Trạng thái kinh doanh sản phẩm <span className="text-[#ba1a1a]">*</span>
              </label>
              <span className="text-[10px] font-mono text-[#687069]">field: sale_status</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                onClick={() => setSaleStatus('ON_SALE')}
                className={`flex items-center gap-3 p-3.5 bg-white rounded shadow-xs cursor-pointer transition-colors border-2 ${
                  saleStatus === 'ON_SALE' ? 'border-[#0B2419]' : 'border-[#E8E9E3]'
                }`}
              >
                <input
                  type="radio"
                  name="sale_status"
                  checked={saleStatus === 'ON_SALE'}
                  onChange={() => setSaleStatus('ON_SALE')}
                  className="accent-[#0B2419]"
                />
                <div>
                  <p className="font-bold text-[#0B2419]">ON_SALE (Đang mở bán)</p>
                  <p className="text-[11px] text-[#687069]">Hiển thị công khai, cho phép thêm giỏ và thanh toán</p>
                </div>
              </label>

              <label
                onClick={() => setSaleStatus('DRAFT')}
                className={`flex items-center gap-3 p-3.5 bg-white rounded shadow-xs cursor-pointer transition-colors border-2 ${
                  saleStatus === 'DRAFT' ? 'border-[#0B2419]' : 'border-[#E8E9E3]'
                }`}
              >
                <input
                  type="radio"
                  name="sale_status"
                  checked={saleStatus === 'DRAFT'}
                  onChange={() => setSaleStatus('DRAFT')}
                  className="accent-[#0B2419]"
                />
                <div>
                  <p className="font-bold text-[#0B2419]">DRAFT (Bản thảo)</p>
                  <p className="text-[11px] text-[#687069]">Chỉ xem nội bộ, không hiển thị trên storefront</p>
                </div>
              </label>

              <label
                onClick={() => setSaleStatus('OFF_SHELF')}
                className={`flex items-center gap-3 p-3.5 bg-white rounded shadow-xs cursor-pointer transition-colors border-2 ${
                  saleStatus === 'OFF_SHELF' ? 'border-[#0B2419]' : 'border-[#E8E9E3]'
                }`}
              >
                <input
                  type="radio"
                  name="sale_status"
                  checked={saleStatus === 'OFF_SHELF'}
                  onChange={() => setSaleStatus('OFF_SHELF')}
                  className="accent-[#0B2419]"
                />
                <div>
                  <p className="font-bold text-[#0B2419]">OFF_SHELF (Ngừng bán)</p>
                  <p className="text-[11px] text-[#687069]">Khóa mua, giữ URL với nhãn tạm lưu trữ</p>
                </div>
              </label>
            </div>
          </div>

          {/* Row 5: Detailed Narrative & Care Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Mô tả chi tiết &amp; Câu chuyện thiết kế (Editorial Narrative)
              </label>
              <textarea
                rows={4}
                defaultValue="Mẫu quần jean phom suông Straight Fit kinh điển dệt từ sợi bông Zimbabwe trứ danh tại nhà dệt Kurabo (Okayama, Nhật Bản). Dệt biên đỏ Selvedge cao cấp, nhuộm chàm Rope-dying 12 lần cho sắc độ Dark Indigo sâu thẳm, giữ phom hoàn hảo theo thời gian và ngả màu fade tự nhiên độc bản theo chuyển động của chủ nhân."
                className="w-full p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3] leading-relaxed"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Chất liệu chi tiết &amp; Hướng dẫn bảo dưỡng (Care Guide)
              </label>
              <textarea
                rows={4}
                defaultValue="100% Cotton Selvedge Denim 13.5oz, cúc đồng nguyên khối đóng dập Atelier Vert. Giặt tay bằng nước lạnh trong 6 tháng đầu, lộn trái phơi trong bóng râm, không dùng chất tẩy mạnh. Khuyến nghị treo thẳng đứng khi không sử dụng để giữ nếp sống quần thẳng thớm."
                className="w-full p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3] leading-relaxed"
              />
            </div>
          </div>
        </form>
      </section>

      {/* Khối B — Quản Lý Hình Ảnh (3:4 Aspect Ratio) */}
      <section className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-[#E8E9E3] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#E8E9E3]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#E5C358] rounded-full"></span>
              <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#0B2419] tracking-tight">
                Thư Viện Hình Ảnh Sản Phẩm (Lookbook &amp; Media)
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showToast('Mở cổng tải ảnh trực tiếp từ máy tính')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f4ef] hover:bg-[#edeee9] text-[#0B2419] rounded text-xs font-semibold border border-[#E8E9E3]"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              Tải Ảnh Lên Kho Lưu Trữ
            </button>
          </div>
        </div>

        {/* Gallery Grid 3:4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mediaList.map((media, idx) => (
            <div
              key={media.id}
              className="bg-[#f3f4ef] rounded-lg overflow-hidden shadow-xs border border-[#E8E9E3] flex flex-col justify-between group"
            >
              <div className="relative aspect-[3/4] bg-[#edeee9] overflow-hidden">
                <img
                  src={media.url}
                  alt={media.altText}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  {media.isPrimary ? (
                    <span className="px-2.5 py-1 bg-[#0B2419] text-white text-[10px] font-bold uppercase tracking-widest rounded shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#E5C358]">star</span>
                      Ảnh đại diện (Primary)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-white/90 text-[#0B2419] text-[10px] font-bold uppercase tracking-widest rounded shadow-sm">
                      Ảnh Lookbook
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-white/90 text-[#101310] text-[10px] font-bold rounded shadow-sm">
                    {media.label}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-2 bg-white text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Alt Text</p>
                  <p className="font-semibold text-[#0B2419] truncate">{media.altText}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">Mã Asset URL</p>
                  <input
                    type="text"
                    readOnly
                    value={media.url}
                    className="w-full px-2 py-1 bg-[#f3f4ef] text-[#687069] text-[10px] font-mono rounded border border-[#E8E9E3] select-all"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#E8E9E3]">
                  {media.isPrimary ? (
                    <span className="text-[10px] font-bold text-[#1B5038] bg-[#FAF4DF] px-2 py-0.5 rounded">
                      Đang làm ảnh bìa
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPrimaryPhoto(idx)}
                      className="text-[10px] font-bold text-[#0B2419] hover:underline uppercase tracking-wider"
                    >
                      Đặt làm ảnh chính
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaList(mediaList.filter((_, i) => i !== idx));
                        showToast('Đã xóa ảnh khỏi danh sách!');
                      }}
                      className="p-1 hover:bg-[#ffdad6] text-[#ba1a1a] rounded"
                      title="Xóa ảnh"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Add Photo Inline Form */}
        <div className="p-5 bg-[#FAF4DF] rounded-lg space-y-3 border border-[#E5C358]/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0B2419] text-[20px]">add_link</span>
            <h4 className="font-bold text-[#0B2419]">Thêm nhanh đường dẫn hình ảnh (Media URL)</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6">
              <input
                type="text"
                placeholder="Dán link ảnh CDN (https://cdn.ateliervert.vn/...)"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-white text-[#191c19] rounded border border-[#E8E9E3] focus:outline-none"
              />
            </div>
            <div className="md:col-span-4">
              <input
                type="text"
                placeholder="Mô tả thẻ Alt cho trợ năng &amp; SEO"
                value={newPhotoAlt}
                onChange={(e) => setNewPhotoAlt(e.target.value)}
                className="w-full px-3.5 py-2 bg-white text-[#191c19] rounded border border-[#E8E9E3] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddMedia}
                className="w-full py-2 px-4 bg-[#0B2419] hover:bg-[#1B5038] text-white font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Thêm Ngay
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Khối C — Ma Trận Biến Thể */}
      <section className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-[#E8E9E3] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#E8E9E3]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#0B2419] rounded-full"></span>
              <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#0B2419] tracking-tight">
                Danh Sách &amp; Quản Lý Biến Thể (SKUs &amp; Matrix)
              </h2>
            </div>
            <p className="text-xs text-[#424844] mt-1">
              Hệ thống đồng bộ tồn kho thực tế từng size, cấu hình giá bán riêng biệt và trạng thái phát hành.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#f8faf4] px-4 py-2 rounded border border-[#E8E9E3] text-xs">
            <span className="text-[#1B5038] font-bold">Tổng cộng {variants.length} biến thể</span>
            <span className="text-[#687069]">•</span>
            <span className="font-semibold text-[#101310]">142 cái sẵn sàng</span>
          </div>
        </div>

        {/* Variants Table */}
        <div className="overflow-x-auto rounded-lg border border-[#E8E9E3]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-[#0B2419] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
              <tr>
                <th className="px-4 py-3">Kích Cỡ</th>
                <th className="px-4 py-3">Màu Sắc</th>
                <th className="px-4 py-3">Mã SKU</th>
                <th className="px-4 py-3">Giá Bán Áp Dụng</th>
                <th className="px-4 py-3">Trạng Thái</th>
                <th className="px-4 py-3 text-center">Tồn Khả Dụng</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {variants.map((v, i) => (
                <tr key={i} className="hover:bg-[#FAF4DF]/40 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-[#0B2419]">
                    <span className="px-2 py-0.5 bg-[#edeee9] rounded font-mono">{v.size}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                        style={{ backgroundColor: v.hex }}
                      ></span>
                      <span className="font-semibold text-[#101310]">{v.color}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[#687069] font-semibold">{v.sku}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-[#0B2419]">{v.price}</span>
                    {v.inherit && <span className="text-[10px] text-[#687069] ml-1">(Kế thừa)</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-[#0B2419]">{v.stock}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => showToast(`Chỉnh sửa SKU ${v.sku}`)}
                      className="px-2.5 py-1 text-[#0B2419] hover:bg-[#edeee9] rounded font-bold uppercase tracking-wider text-[11px]"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form Tạo Mới Biến Thể */}
        <div className="p-5 bg-[#f3f4ef] rounded-lg space-y-4 border border-[#E8E9E3] text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#0B2419] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">playlist_add</span>
              + Thêm Mới Biến Thể Sản Phẩm
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Size *
              </label>
              <select
                value={newVarSize}
                onChange={(e) => {
                  setNewVarSize(e.target.value);
                  setNewVarSku(`KMD-ST-IND-${e.target.value.replace('SZ-', '')}`);
                }}
                className="w-full px-3 py-2 bg-white rounded border border-[#E8E9E3] font-bold text-[#0B2419]"
              >
                <option value="SZ-28">28 (Jeans Waist)</option>
                <option value="SZ-29">29 (Jeans Waist)</option>
                <option value="SZ-30">30 (Jeans Waist)</option>
                <option value="SZ-31">31 (Jeans Waist)</option>
                <option value="SZ-32">32 (Jeans Waist)</option>
                <option value="SZ-33">33 (Jeans Waist - Đề xuất mới)</option>
                <option value="SZ-34">34 (Jeans Waist)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Màu sắc *
              </label>
              <select
                value={newVarColor}
                onChange={(e) => setNewVarColor(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded border border-[#E8E9E3] font-bold text-[#0B2419]"
              >
                <option value="COL-101">Chàm Indigo Đậm (#1C2841)</option>
                <option value="COL-102">Đen Mộc One-Wash (#151517)</option>
                <option value="COL-103">Chàm Sáng Vintage (#4B6B94)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Mã SKU
              </label>
              <input
                type="text"
                value={newVarSku}
                onChange={(e) => setNewVarSku(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded border border-[#E8E9E3] font-mono font-bold text-[#0B2419]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Giá riêng (₫)
              </label>
              <input
                type="text"
                placeholder="1.850.000 (Trống = cơ bản)"
                value={newVarPrice}
                onChange={(e) => setNewVarPrice(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded border border-[#E8E9E3]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                Trạng thái *
              </label>
              <select
                value={newVarStatus}
                onChange={(e) => setNewVarStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded border border-[#E8E9E3] font-bold text-[#0B2419]"
              >
                <option value="ON_SALE">ON_SALE (Đang bán)</option>
                <option value="DRAFT">DRAFT (Bản thảo)</option>
                <option value="OFF_SHELF">OFF_SHELF (Ngừng bán)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#E8E9E3]">
            <span className="text-[11px] text-[#687069]">
              Biến thể mới sau khi thêm sẽ lập tức khởi tạo bản ghi kho tồn khả dụng = 0 cái.
            </span>
            <button
              type="button"
              onClick={handleAddVariant}
              className="px-5 py-2.5 bg-[#0B2419] hover:bg-[#1B5038] text-white font-bold rounded shadow-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">playlist_add_check</span>
              Thêm Biến Thể Vào Hệ Thống
            </button>
          </div>
        </div>
      </section>

      {/* Footer Auditing Actions */}
      <section className="bg-white p-5 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#687069]">
          <span className="material-symbols-outlined text-[18px] text-[#123A29]">history_toggle_off</span>
          <span>Khởi tạo ngày <strong>12/08/2026</strong> bởi Super Admin</span>
          <span>•</span>
          <span>Lần cập nhật cuối <strong>24/09/2026 15:45</strong> bởi Lê Hoàng Quân</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('san-pham', 'Sản phẩm')}
            className="px-4 py-2 bg-[#f3f4ef] text-[#0B2419] hover:bg-[#edeee9] rounded font-bold uppercase tracking-wider"
          >
            Quay Lại Danh Sách
          </button>
          <button
            type="button"
            onClick={() => {
              showToast('Đã lưu tất cả thông tin và ma trận biến thể của PRD-00102 thành công!');
              onNavigateTab('san-pham', 'Sản phẩm');
            }}
            className="px-6 py-2.5 bg-[#E5C358] text-[#101310] hover:bg-[#d6b54a] rounded font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            Lưu Tất Cả Thông Tin Sản Phẩm
          </button>
        </div>
      </section>
    </div>
  );
};
