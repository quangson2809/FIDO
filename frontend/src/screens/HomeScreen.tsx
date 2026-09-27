import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import { toUiProduct } from '../mocks/uiData';
import { mockBrands } from '../mocks/apiData';

export const HomeScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedProductId, addToCart, wishlist, toggleWishlist } = useApp();
  const [selectedParentCategory, setSelectedParentCategory] = useState<'ALL' | 'ÁO' | 'QUẦN' | 'PHỤ KIỆN'>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');

  const [products, setProducts] = useState<any[]>([]);
  
  React.useEffect(() => {
    catalogService.getProducts().then((items) => setProducts(items.map(toUiProduct)));
  }, []);

  const filteredFeaturedProducts = products.slice(0, 6).filter((p) => {
    if (selectedParentCategory === 'ÁO' && p.parentCategory !== 'Áo') return false;
    if (selectedParentCategory === 'QUẦN' && p.parentCategory !== 'Quần') return false;
    if (selectedParentCategory === 'PHỤ KIỆN' && p.parentCategory !== 'Phụ kiện') return false;
    if (selectedBrand !== 'ALL' && !p.brand.toLowerCase().includes(selectedBrand.toLowerCase())) return false;
    return true;
  });

  const handleOpenProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-[#FFFFFF]" id="trang-chu">
      {/* Sub Breadcrumb Header */}
      <div className="w-full h-[44px] bg-[#F5F6F2] border-b border-[#E2E5DE] px-4 sm:px-8 flex items-center text-[13px] text-[#606863] font-medium">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419] transition-colors">
            Trang chủ
          </button>
          <span className="text-[#9CA3AF]">/</span>
          <button onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419] transition-colors">
            Bộ sưu tập
          </button>
          <span className="text-[#9CA3AF]">/</span>
          <span className="text-[#0B2419] font-semibold">Khám phá</span>
        </div>
      </div>

      <div className="flex flex-col w-full">
        {/* SECTION 1: HERO CAMPAIGN */}
        <section className="relative w-full overflow-hidden bg-[#FFFDF5]">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 min-h-[640px] lg:min-h-[760px]">
            {/* Text Narrative Column */}
            <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10">
              <div className="space-y-4 pt-2 lg:pt-8">
                <div className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E8C75B]"></span>
                  <span className="text-[10px] tracking-[0.2em] text-[#0B2419] font-bold uppercase">
                    BỘ SƯU TẬP MAY SẴN SẴN SÀNG GIAO NGAY • RTW 2025
                  </span>
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] text-[#0B2419] tracking-tight font-normal leading-[1.08]">
                  BẢN THỂ<br />
                  <span className="italic font-normal text-[#123A29]">TỐI GIẢN.</span>
                </h1>
                <p className="text-[15px] sm:text-[16px] text-[#424844] max-w-md font-light leading-relaxed pt-2">
                  Bộ sưu tập thời trang may sẵn cao cấp (Ready-to-Wear) hội tụ phom dáng may sẵn chuẩn mực, chất liệu thượng hạng và hàng có sẵn đủ size tại hệ thống showroom trên toàn quốc.
                </p>
                <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentScreen('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#0B2419] hover:bg-[#1B5038] text-white text-[12px] font-bold tracking-widest uppercase transition-all duration-300 shadow-md cursor-pointer"
                  >
                    <span>KHÁM PHÁ BỘ SƯU TẬP</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                  <a
                    href="#editorial"
                    className="inline-flex items-center justify-center px-7 py-4 bg-transparent hover:bg-[#FAF4DF] text-[#0B2419] text-[12px] font-bold tracking-widest uppercase transition-all duration-300 border border-[#0B2419]/30"
                  >
                    XEM LOOKBOOK
                  </a>
                </div>
              </div>

              {/* Metric Accent Footer */}
              <div className="pt-10 pb-2 grid grid-cols-3 gap-4 text-[#0B2419] border-t border-[#E8E9E3]/70">
                <div>
                  <span className="font-serif text-2xl font-bold block">ĐỦ SIZE</span>
                  <span className="text-[10px] text-[#424844] font-semibold uppercase tracking-wider">
                    S Đến XXL Có Sẵn
                  </span>
                </div>
                <div>
                  <span className="font-serif text-2xl font-bold block">2 GIỜ</span>
                  <span className="text-[10px] text-[#424844] font-semibold uppercase tracking-wider">
                    Giao Hỏa Tốc
                  </span>
                </div>
                <div>
                  <span className="font-serif text-2xl font-bold block">100%</span>
                  <span className="text-[10px] text-[#424844] font-semibold uppercase tracking-wider">
                    Có Sẵn Showroom
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Visual Column */}
            <div className="lg:col-span-7 relative min-h-[440px] lg:min-h-full">
              <img
                alt="Atelier Vert Campaign Collection Editorial"
                className="w-full h-full object-cover object-center scale-[1.01] transition-transform duration-700 hover:scale-100"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB43j3U0QGfklvPCyrYdm_4uqdh7U1m_789gJgb9dh6wEkBdhY0mzlP7RRDQrhmLsrOknJ0jGRSmcq2PpIVgOXBQ4oZv3lNU8bndQhMe1NvknIqzt4CKSagNfZxwQWAon2oy6ggXrwuqZITn4oBz_g9S47_4eVaQuBi8oxwXP7nih4Pze-AjnEh0sTWqBN0FpTQKswUiZsjLo6Gn8-32F9v9d7VMDcwjWJJ1bBVwriGH43Q4012h51B1A"
              />
              <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 bg-[#071A12]/85 backdrop-blur-md text-[#FFFDF5] px-4 py-2.5 flex items-center gap-3 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C75B] animate-ping"></span>
                <span className="text-[10px] uppercase font-bold tracking-widest">
                  Hàng Có Sẵn Tại Hệ Thống Showroom • Sẵn Sàng Giao Ngay
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICE ADVANTAGES (Warm Ivory Strip) */}
        <section className="w-full bg-[#FFFDF5] py-8 border-y border-[#E8E9E3]/80">
          <div className="w-full px-4 sm:px-8 lg:px-14 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[#0B2419] text-[28px] mt-0.5">bolt</span>
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#0B2419]">Giao Hàng Theo Điều Phối</h4>
                  <p className="text-[13px] text-[#424844] leading-relaxed">
                    Giao nội bộ hoặc qua đơn vị vận chuyển ngoài theo phương án vận hành.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[#0B2419] text-[28px] mt-0.5">published_with_changes</span>
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#0B2419]">Đổi / Hoàn Tại Cửa Hàng Trong 02 Ngày</h4>
                  <p className="text-[13px] text-[#424844] leading-relaxed">
                    Áp dụng sau khi đơn COMPLETED và đáp ứng điều kiện nhãn/mác.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[#0B2419] text-[28px] mt-0.5">straighten</span>
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#0B2419]">Hỗ Trợ Tại Cửa Hàng</h4>
                  <p className="text-[13px] text-[#424844] leading-relaxed">
                    Các hỗ trợ tại cửa hàng thực hiện theo chính sách nội dung đã được duyệt.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[#0B2419] text-[28px] mt-0.5">storefront</span>
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-[#0B2419]">Hàng Có Sẵn Tại Showroom</h4>
                  <p className="text-[13px] text-[#424844] leading-relaxed">
                    Đầy đủ size số từ S đến XXL sẵn sàng thử trực tiếp tại showroom.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KHỐI A: DANH MỤC SẢN PHẨM (Phân cấp Cây Cha/Con, Tabs, Chips & Cards) */}
        <section className="w-full bg-[#FFFFFF] py-14" id="danh-muc">
          <div className="w-full px-4 sm:px-8 lg:px-14 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E9E3] pb-6">
              <div>
                <span className="text-[10px] tracking-[0.2em] text-[#1B5038] uppercase block mb-1 font-bold">
                  KHỐI A • PHÂN LOẠI &amp; ĐIỀU HƯỚNG
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#0B2419]">DANH MỤC SẢN PHẨM</h2>
                <p className="text-[14px] text-[#424844] mt-1">
                  Cấu trúc danh mục đa tầng theo cây cha/con, dễ dàng chọn nhanh sản phẩm ưng ý
                </p>
              </div>

              {/* Tabs Chuyển Đổi Nhanh Theo Danh Mục Cha */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(['ALL', 'ÁO', 'QUẦN', 'PHỤ KIỆN'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedParentCategory(tab)}
                    className={`px-4 py-2 text-[12px] font-bold tracking-wider uppercase transition-colors shrink-0 ${
                      selectedParentCategory === tab
                        ? 'bg-[#0B2419] text-white'
                        : 'bg-[#f3f4ef] hover:bg-[#e7e9e3] text-[#0B2419]'
                    }`}
                  >
                    {tab === 'ALL' ? 'TẤT CẢ' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Cây Danh Mục Chi Tiết Dạng Chips Cha/Con */}
            <div className="bg-[#FFFDF5] p-4 sm:p-5 border border-[#E8E9E3] space-y-3">
              {/* Cây Áo */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold text-[#0B2419] bg-[#edeee9] px-2.5 py-1">
                  <span className="material-symbols-outlined text-[16px]">checkroom</span> Áo (Cha):
                </span>
                {[
                  { name: 'Áo thun', count: 12 },
                  { name: 'Áo sơ mi', count: 18 },
                  { name: 'Áo polo', count: 9 },
                  { name: 'Áo khoác & Blazer', count: 14 }
                ].map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setCurrentScreen('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1 bg-white hover:bg-[#0B2419] hover:text-white text-[12px] text-[#424844] transition-colors border border-[#E8E9E3]"
                  >
                    {cat.name} <span className="text-[10px] text-[#687069] ml-1">({cat.count})</span>
                  </button>
                ))}
              </div>

              <div className="w-full h-px bg-[#E8E9E3]/70"></div>

              {/* Cây Quần */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold text-[#0B2419] bg-[#edeee9] px-2.5 py-1">
                  <span className="material-symbols-outlined text-[16px]">dry_cleaning</span> Quần (Cha):
                </span>
                {[
                  { name: 'Quần jeans', count: 24 },
                  { name: 'Quần tây âu', count: 16 },
                  { name: 'Quần short', count: 10 },
                  { name: 'Quần kaki / Chinos', count: 8 }
                ].map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setCurrentScreen('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-1 bg-white hover:bg-[#0B2419] hover:text-white text-[12px] text-[#424844] transition-colors border border-[#E8E9E3]"
                  >
                    {cat.name} <span className="text-[10px] text-[#687069] ml-1">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cards Danh Mục Trực Quan Sinh Động */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
              {/* Card 1: Quần Jean & Denim */}
              <div
                onClick={() => {
                  setSelectedProductId('prod-1');
                  setCurrentScreen('product-detail');
                }}
                className="group relative aspect-[3/4] overflow-hidden flex flex-col justify-end p-6 bg-[#e7e9e3] cursor-pointer"
              >
                <img
                  alt="Danh mục Quần Jean & Denim"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1XxKDE0XEbbzc6iGCPUDgORPtMntN4-zQ3Vwvb7KM-AEVXLT5IfZBSjcaxidC42etdq5Edswq9ysfaLF1ZxlM7d0LBeJNBlpZ9ks4cg_cESTl0s9meCo-zMSqqTnGQTusrQMnvJqvGFCyofamUR-XDcyuKkdy1ioaPpoVUwkE6-zfY_H6KVLOIkwTHWeYiAk65GIqERJM1MWL-ZJKw02gKBdtPf1tgomzh4ja6l3v1zMC_VUF7NL7P9woRm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/90 via-[#071A12]/30 to-transparent"></div>
                <div className="relative z-10 space-y-1 text-white">
                  <span className="text-[10px] tracking-widest uppercase text-[#E8C75B] block font-bold">
                    24 MẪU THIẾT KẾ • QUẦN CHA
                  </span>
                  <h3 className="font-serif text-xl tracking-wide">QUẦN JEAN &amp; DENIM</h3>
                  <p className="text-[12px] text-[#e7e9e3] font-light line-clamp-1">
                    Ống suông, Slim-fit, Dệt Selvedge Kurabo
                  </p>
                  <span className="text-[11px] uppercase tracking-widest text-[#FFFDF5]/90 flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-1 font-semibold">
                    Khám phá danh mục <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Card 2: Áo Sơ Mi & Polo */}
              <div
                onClick={() => {
                  setSelectedProductId('prod-2');
                  setCurrentScreen('product-detail');
                }}
                className="group relative aspect-[3/4] overflow-hidden flex flex-col justify-end p-6 bg-[#e7e9e3] cursor-pointer"
              >
                <img
                  alt="Danh mục Áo Sơ Mi & Polo"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1WHRcMrnuUTbkYBPh2OKYQsUSkqjEhPkk93kMFesyYDEsGBHVtevc2JUQ0gGErDYzfuHhGZN8JUAjS3VccWxmduD0Iggn157B9oBLoiRZYEJwa-mG51j57_1AymuRkElenVWeJX0auZY6kfYL2iv175jA9FZYYrldHVC0T1D6-p98V-WHqNjOEiJoBFtGEd2hgntyeH88MPjHS9FPwgtQxWcHloFlSggZJDTMcZfSv4aih9E1UeBkvUDW8"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/90 via-[#071A12]/30 to-transparent"></div>
                <div className="relative z-10 space-y-1 text-white">
                  <span className="text-[10px] tracking-widest uppercase text-[#E8C75B] block font-bold">
                    27 MẪU THIẾT KẾ • ÁO CHA
                  </span>
                  <h3 className="font-serif text-xl tracking-wide">ÁO SƠ MI &amp; POLO</h3>
                  <p className="text-[12px] text-[#e7e9e3] font-light line-clamp-1">
                    Linen tự nhiên, Cotton Albini, Cuban collar
                  </p>
                  <span className="text-[11px] uppercase tracking-widest text-[#FFFDF5]/90 flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-1 font-semibold">
                    Khám phá danh mục <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Card 3: Áo Khoác & Blazer */}
              <div
                onClick={() => {
                  setSelectedProductId('prod-4');
                  setCurrentScreen('product-detail');
                }}
                className="group relative aspect-[3/4] overflow-hidden flex flex-col justify-end p-6 bg-[#e7e9e3] cursor-pointer"
              >
                <img
                  alt="Danh mục Áo Khoác & Blazer"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1VmUvdUdLhaiG5KonOOVDvROZ6_5yZdViucCicsHKsh19HuQ08GjQI_AORsxT_aQaCZBXHCWH8sylH29P7XYJZicZdR0_F4xox2lE_gcLVUyAdNvuw0RJez-WsCA-4kAIG6SZzisHjoPxAzqi385xidW1HXyebd2939XxqdoAmDgjQBGuceOHmUYxA7HeZ18UcGL5mrarIcoNTCvJEODdJOoGlQSZE5oyM-rW6E0SvyjM0lZ_SwNPHqORM9"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/90 via-[#071A12]/30 to-transparent"></div>
                <div className="relative z-10 space-y-1 text-white">
                  <span className="text-[10px] tracking-widest uppercase text-[#E8C75B] block font-bold">
                    14 MẪU THIẾT KẾ • ÁO CHA
                  </span>
                  <h3 className="font-serif text-xl tracking-wide">ÁO KHOÁC &amp; BLAZER</h3>
                  <p className="text-[12px] text-[#e7e9e3] font-light line-clamp-1">
                    Tailored Jacket, Len Ý Loro Piana may sẵn
                  </p>
                  <span className="text-[11px] uppercase tracking-widest text-[#FFFDF5]/90 flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-1 font-semibold">
                    Khám phá danh mục <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>

              {/* Card 4: Quần Short & Kaki */}
              <div
                onClick={() => {
                  setSelectedProductId('prod-6');
                  setCurrentScreen('product-detail');
                }}
                className="group relative aspect-[3/4] overflow-hidden flex flex-col justify-end p-6 bg-[#e7e9e3] cursor-pointer"
              >
                <img
                  alt="Danh mục Quần Short & Kaki"
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1UWUDkTKr0Jz3-sfPwc2ZqWjY7J6n80o6c4GWVBZ0ZkAMxaJccsVAYrRxY5tocmVoE4Sjsq3A9PQK2P3OYh-WQJZMbcKkqlS5XYVXNuTmtdsHisYlSzDsfzGVX-a4lNJIRmuJjWkY2iSk9wZ-YX2bFNDg3jvwZq7D-7y1zYW1SjW7mnY7fXar5Ub801KK1S6lXcdIhaCYAHTfHipOUIgCeyDHzscLYvWq9NmjwFsZE2BQBJkmZciM-hmp1w"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/90 via-[#071A12]/30 to-transparent"></div>
                <div className="relative z-10 space-y-1 text-white">
                  <span className="text-[10px] tracking-widest uppercase text-[#E8C75B] block font-bold">
                    18 MẪU THIẾT KẾ • QUẦN CHA
                  </span>
                  <h3 className="font-serif text-xl tracking-wide">QUẦN SHORT &amp; TÂY ÂU</h3>
                  <p className="text-[12px] text-[#e7e9e3] font-light line-clamp-1">
                    Phom may đo phẳng phiu, co giãn nhẹ
                  </p>
                  <span className="text-[11px] uppercase tracking-widest text-[#FFFDF5]/90 flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-1 font-semibold">
                    Khám phá danh mục <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KHỐI B: THƯƠNG HIỆU & ĐỐI TÁC DỆT (Thanh chip/filter ngang tinh tế) */}
        <section className="w-full bg-[#FAF4DF]/70 py-6 border-y border-[#E8E9E3]" id="thuong-hieu">
          <div className="w-full px-4 sm:px-8 lg:px-14 max-w-7xl mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px]">verified</span>
                <h3 className="text-[16px] text-[#0B2419] uppercase tracking-wider font-bold">
                  KHỐI B • THƯƠNG HIỆU &amp; ĐỐI TÁC DỆT CHÍNH HÃNG
                </h3>
              </div>
              <span className="text-[11px] text-[#1B5038] tracking-widest uppercase font-bold">
                ${mockBrands.length} THƯƠNG HIỆU TRONG MOCK
              </span>
            </div>

            {/* Thanh Filter Chips Ngang */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              <button
                onClick={() => setSelectedBrand('ALL')}
                className={`inline-flex items-center gap-2 px-4 py-2 border text-[12px] font-bold uppercase tracking-wider transition-all shadow-sm shrink-0 ${
                  selectedBrand === 'ALL'
                    ? 'bg-[#0B2419] text-white border-[#0B2419]'
                    : 'bg-white text-[#0B2419] border-[#E8E9E3]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C75B]"></span>
                TẤT CẢ THƯƠNG HIỆU
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{products.length}</span>
              </button>

              {mockBrands.map((brand) => {
                const count = products.filter((product) => product.brand === brand.name).length;
                return (
                <button
                  key={brand.name}
                  onClick={() => setSelectedBrand(brand.name)}
                  className={`inline-flex items-center gap-2 px-4 py-2 border text-[12px] font-semibold uppercase tracking-wider transition-all shrink-0 ${
                    selectedBrand === brand.name
                      ? 'bg-[#0B2419] text-white border-[#0B2419]'
                      : 'bg-white hover:bg-[#FFFDF5] text-[#0B2419] border-[#E8E9E3]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#687069]">sell</span>
                  {brand.name}
                  <span className="text-[10px] text-[#687069] bg-[#edeee9] px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* KHỐI C: SẢN PHẨM CHUẨN DTO & THÔNG TIN ĐẦY ĐỦ */}
        <section className="w-full bg-[#FFFFFF] py-14" id="danh-sach-san-pham">
          <div className="w-full px-4 sm:px-8 lg:px-14 max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-[#E8E9E3] pb-6">
              <div>
                <span className="text-[10px] tracking-[0.2em] text-[#1B5038] uppercase block mb-1 font-bold">
                  KHỐI C • SẢN PHẨM TUYỂN CHỌN (DTO CHUẨN)
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#0B2419]">THIẾT KẾ MAY SẴN NỔI BẬT</h2>
                <p className="text-[14px] text-[#424844] mt-1">
                  Đầy đủ thông tin: Ảnh, Tên, Danh mục, Thương hiệu, Giá niêm yết và Trạng thái bán hàng
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentScreen('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[12px] font-bold tracking-widest text-[#0B2419] uppercase hover:text-[#1B5038] transition-colors flex items-center gap-1 group cursor-pointer"
              >
                <span>XEM TẤT CẢ SẢN PHẨM</span>
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                  east
                </span>
              </button>
            </div>

            {/* Products Grid (6 Items) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeaturedProducts.map((product) => {
                const isFavorite = wishlist.includes(product.id);
                return (
                  <div
                    key={product.id}
                    className="group flex flex-col bg-white border border-[#E8E9E3] hover:border-[#0B2419]/40 transition-all duration-300"
                  >
                    <div className="relative w-full aspect-[3/4] bg-[#f3f4ef] overflow-hidden">
                      <div
                        onClick={() => handleOpenProduct(product.id)}
                        className="w-full h-full cursor-pointer"
                      >
                        <img
                          alt={product.name}
                          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                          src={product.imageUrl}
                        />
                      </div>

                      {/* Status Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        <span className="bg-[#0B2419] text-white px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                          ĐANG BÁN
                        </span>
                        {product.discountPercent && (
                          <span className="bg-[#E8C75B] text-[#101310] px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                            -{product.discountPercent}%
                          </span>
                        )}
                        {product.statusBadge && !product.discountPercent && (
                          <span className="bg-[#1B5038] text-white px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                            {product.statusBadge}
                          </span>
                        )}
                      </div>

                      {/* Wishlist Button */}
                      <button
                        type="button"
                        aria-label="Thêm vào danh sách yêu thích"
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-3 right-3 w-9 h-9 bg-white/90 hover:bg-white text-[#0B2419] rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer z-10"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            isFavorite ? 'text-[#ba1a1a]' : 'text-[#0B2419]'
                          }`}
                        >
                          favorite
                        </span>
                      </button>

                      {/* Quick Add Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="w-full py-3 bg-[#0B2419] hover:bg-[#1B5038] text-white text-[11px] font-bold tracking-widest uppercase transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                          + THÊM NHANH VÀO GIỎ
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex flex-col flex-1 justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[#1B5038] uppercase tracking-wider font-semibold">
                          <span>
                            {product.category} • {product.parentCategory} (Cha)
                          </span>
                          <span className="text-[#0B2419]">{product.brand}</span>
                        </div>
                        <h3
                          onClick={() => handleOpenProduct(product.id)}
                          className="text-[15px] font-bold text-[#0B2419] hover:text-[#1B5038] transition-colors leading-snug cursor-pointer line-clamp-1"
                        >
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-[#687069] line-clamp-1">{product.description}</p>
                      </div>

                      {/* Price & Action */}
                      <div className="pt-2 border-t border-[#E8E9E3]/80 flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[17px] text-[#0B2419] font-bold font-mono">
                            {((product.price as number) || 0).toLocaleString('vi-VN')} ₫
                          </span>
                          {product.originalPrice && (
                            <span className="text-[13px] text-[#687069] line-through font-mono">
                              {(product.originalPrice as number || 0).toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenProduct(product.id)}
                          className="text-[11px] tracking-wider text-[#0B2419] uppercase font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                        >
                          CHI TIẾT <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION: EDITORIAL CAMPAIGN & LOOKBOOK */}
        <section className="w-full bg-[#FAF4DF] py-16" id="editorial">
          <div className="w-full px-4 sm:px-8 lg:px-14 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Visual Composition */}
              <div className="lg:col-span-6 relative">
                <div className="relative aspect-[4/5] overflow-hidden bg-white shadow-md">
                  <img
                    alt="Atelier Vert Craftsmanship and Fabric Texture Detail"
                    className="w-full h-full object-cover object-center"
                    src="https://lh3.googleusercontent.com/aida/AEtjO1WHRcMrnuUTbkYBPh2OKYQsUSkqjEhPkk93kMFesyYDEsGBHVtevc2JUQ0gGErDYzfuHhGZN8JUAjS3VccWxmduD0Iggn157B9oBLoiRZYEJwa-mG51j57_1AymuRkElenVWeJX0auZY6kfYL2iv175jA9FZYYrldHVC0T1D6-p98V-WHqNjOEiJoBFtGEd2hgntyeH88MPjHS9FPwgtQxWcHloFlSggZJDTMcZfSv4aih9E1UeBkvUDW8"
                  />
                </div>
                {/* Floating Detail Box */}
                <div className="hidden sm:block absolute -bottom-6 -right-6 bg-[#FFFDF5] p-6 shadow-xl max-w-xs border border-[#E8E9E3]">
                  <span className="text-[10px] text-[#1B5038] tracking-widest uppercase block mb-1 font-bold">
                    CHI TIẾT VẢI DỆT
                  </span>
                  <p className="text-[13px] text-[#424844] leading-relaxed">
                    Chất liệu được xử lý co rút chuẩn xác trước khi may giúp trang phục may sẵn giữ nguyên phom dáng chuẩn mực và độ bền bỉ sau nhiều chu kỳ giặt.
                  </p>
                </div>
              </div>

              {/* Right Content Narrative */}
              <div className="lg:col-span-6 lg:pl-10 space-y-4 mt-8 lg:mt-0">
                <span className="text-[11px] tracking-[0.25em] text-[#1B5038] uppercase block font-bold">
                  CHUẨN MỰC READY-TO-WEAR
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#0B2419] leading-[1.12]">
                  PHOM DÁNG MAY SẴN CHUẨN MỰC.
                </h2>
                <p className="text-[15px] text-[#424844] font-light leading-relaxed">
                  Bộ sưu tập may sẵn sẵn sàng giao ngay của Atelier Vert mang lại trải nghiệm vừa vặn hoàn hảo mà không cần chờ đợi đặt may. Ứng dụng hệ thống bảng size chuẩn hóa cho vóc dáng nam giới Việt, hàng có sẵn đủ size để bạn lựa chọn và nhận hàng theo phương án giao được xác nhận.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-[#FFFDF5] p-4 border border-[#E8E9E3]">
                    <span className="font-serif text-[18px] text-[#0B2419] font-bold block mb-1">
                      Sẵn Sàng Giao Ngay
                    </span>
                    <p className="text-[12px] text-[#424844]">
                      Hàng khả dụng được xác định theo variant và available_quantity.
                    </p>
                  </div>
                  <div className="bg-[#FFFDF5] p-4 border border-[#E8E9E3]">
                    <span className="font-serif text-[18px] text-[#0B2419] font-bold block mb-1">
                      Lên Gấu Lấy Ngay
                    </span>
                    <p className="text-[12px] text-[#424844]">
                      Các hỗ trợ tại cửa hàng áp dụng theo chính sách được duyệt.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setCurrentScreen('catalog');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 text-[12px] font-bold text-[#0B2419] tracking-widest uppercase hover:text-[#1B5038] transition-colors pb-1 border-b-2 border-[#0B2419] cursor-pointer"
                  >
                    <span>XEM BỘ SƯU TẬP READY-TO-WEAR</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: BRAND PHILOSOPHY BANNER */}
        <section className="w-full bg-[#0B2419] text-[#FFFDF5] py-16 relative overflow-hidden" id="showroom">
          <div className="w-full px-4 sm:px-8 lg:px-14 max-w-7xl mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <span className="w-8 h-[1px] bg-[#E8C75B]"></span>
                <span className="text-[11px] tracking-[0.3em] uppercase text-[#E8C75B] font-bold">
                  TRIẾT LÝ ATELIER VERT
                </span>
                <span className="w-8 h-[1px] bg-[#E8C75B]"></span>
              </div>
              <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal leading-tight text-[#FFFDF5]">
                “THỜI TRANG MAY SẴN ĐẲNG CẤP: PHOM DÁNG CHUẨN MỰC, CHẤT LIỆU TINH TUYỂN VÀ SẴN SÀNG GIAO NGAY.”
              </blockquote>
              <p className="text-[14px] text-[#e1e3de] max-w-xl mx-auto font-light leading-relaxed">
                Hàng có sẵn tại hệ thống showroom trên toàn quốc với đầy đủ bảng size. Ghé thăm cửa hàng để trải nghiệm trực tiếp, thử phom dáng chuẩn mực và nhận hỗ trợ lên gấu quần miễn phí lấy ngay.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setCurrentScreen('showrooms');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-[#FFFDF5] text-[#0B2419] hover:bg-[#FAF4DF] text-[12px] tracking-widest uppercase font-bold transition-colors shadow-md cursor-pointer"
                >
                  TÌM CỬA HÀNG GẦN BẠN
                </button>
                <button
                  onClick={() => {
                    setCurrentScreen('showrooms');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-transparent text-[#FFFDF5] hover:text-[#E8C75B] text-[12px] tracking-widest uppercase transition-colors flex items-center gap-2 border border-[#FFFDF5]/30 cursor-pointer"
                >
                  <span>ĐẶT LỊCH HẸN THỬ ĐỒ</span>
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
