import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import { toUiProduct } from '../mocks/uiData';

export const ProductDetailScreen: React.FC = () => {
  const {
    selectedProductId,
    addToCart,
    wishlist,
    toggleWishlist,
    setCurrentScreen,
    setIsCartOpen
  } = useApp();

  const [product, setProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  React.useEffect(() => {
    catalogService.getProducts().then((items) => {
      const all = items.map(toUiProduct);
      setProducts(all);
      const selected = all.find((item) => item.product_id.toString() === selectedProductId) || all[0];
      setProduct(selected);
    });
  }, [selectedProductId]);

  if (!product) return <div>Loading...</div>;

  const isFavorite = wishlist.includes(product.product_id.toString());
  // ... adapt remaining UI using product object ...

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name || 'Dark Indigo (Xanh Chàm Đậm)');
  const [selectedSize, setSelectedSize] = useState<string | number>(product.sizes[2] || 31);
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<number[]>([0]);

  const gallery = product.galleryImages && product.galleryImages.length > 0 ? product.galleryImages : [product.imageUrl];

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  const toggleAccordion = (index: number) => {
    if (openAccordions.includes(index)) {
      setOpenAccordions(openAccordions.filter((i) => i !== index));
    } else {
      setOpenAccordions([...openAccordions, index]);
    }
  };

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    setCurrentScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddCombo = () => {
    const shirtProduct = products.find((p: any) => p.product_id.toString() === '2') || products[1];
    addToCart(product, selectedSize, selectedColor, 1);
    addToCart(shirtProduct, 'L', 'Xám Khói Smoke', 1);
    setIsCartOpen(true);
  };

  return (
    <div className="w-full bg-[#FFFFFF]">
      {/* Breadcrumbs */}
      <div className="w-full h-[44px] bg-[#F5F6F2] border-b border-[#E2E5DE] px-4 sm:px-8 flex items-center text-[13px] text-[#606863] font-medium">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419] transition-colors">
            Trang chủ
          </button>
          <span className="text-[#A0A69F]">/</span>
          <button onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419] transition-colors">
            {product.parentCategory}
          </button>
          <span className="text-[#A0A69F]">/</span>
          <span className="text-[#0B2419] font-semibold truncate max-w-xs">{product.name}</span>
        </nav>
      </div>

      {/* Main Showcase Container: 65% Gallery / 35% Sticky Info Panel */}
      <section className="w-full px-4 sm:px-8 lg:px-14 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* LEFT: 65% Editorial Media Gallery */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            <div className="flex flex-col-reverse md:flex-row gap-4 items-start">
              {/* Vertical Thumbnails Column */}
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto w-full md:w-24 shrink-0 pb-2 md:pb-0">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`thumb-btn group relative w-20 md:w-24 aspect-[3/4] bg-[#f3f4ef] overflow-hidden focus:outline-none transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'ring-2 ring-[#0B2419] ring-offset-2'
                        : 'ring-1 ring-[#E8E9E3] hover:ring-2 hover:ring-[#687069]'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                ))}
              </div>

              {/* Main Featured Image Showcase */}
              <div className="relative flex-1 w-full bg-[#f3f4ef] overflow-hidden group aspect-[3/4] sm:aspect-[4/5] shadow-sm">
                <img
                  id="main-product-image"
                  src={gallery[activeImageIndex] || product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Previous Arrow Button */}
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Xem ảnh trước"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 backdrop-blur-md shadow-md text-[#0B2419] flex items-center justify-center hover:bg-white transition-all focus:outline-none cursor-pointer z-10"
                >
                  <span className="material-symbols-outlined text-[22px] md:text-[26px]">chevron_left</span>
                </button>

                {/* Next Arrow Button */}
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Xem ảnh tiếp theo"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 backdrop-blur-md shadow-md text-[#0B2419] flex items-center justify-center hover:bg-white transition-all focus:outline-none cursor-pointer z-10"
                >
                  <span className="material-symbols-outlined text-[22px] md:text-[26px]">chevron_right</span>
                </button>

                {/* Status Tag */}
                <div className="absolute top-4 left-4 bg-[#071A12]/90 backdrop-blur-sm text-[#FFFDF5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest">
                  Góc Nhìn Toàn Thể
                </div>
                <button
                  type="button"
                  aria-label="Phóng to ảnh"
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm text-[#0B2419] flex items-center justify-center hover:bg-[#0B2419] hover:text-white transition-colors shadow-sm focus:outline-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">zoom_in</span>
                </button>
              </div>
            </div>

            {/* Curated Editorial Highlight Banner */}
            <div className="w-full p-6 md:p-8 bg-[#FAF4DF] text-[#101310] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#E8C75B]/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#0B2419] text-[#E8C75B] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">precision_manufacturing</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#687069] block font-bold">
                    Vải Dệt Con Thoi Thủ Công Kurabo
                  </span>
                  <h3 className="font-serif text-[18px] sm:text-[20px] text-[#0B2419] leading-tight font-bold">
                    13.5 oz Japanese Selvedge Denim • 100% Sợi Bông Hữu Cơ
                  </h3>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#1B5038] bg-white px-4 py-2 border border-[#E8E9E3]">
                <span className="material-symbols-outlined text-base">award_star</span>
                <span>Mép Biên Đỏ Nguyên Bản</span>
              </div>
            </div>

            {/* Material Craftsmanship Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-[#f3f4ef] border border-[#E8E9E3]">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Nguồn gốc sợi</span>
                <span className="text-[15px] font-bold text-[#0B2419]">Bông Tân Cương 100%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Độ nặng vải</span>
                <span className="text-[15px] font-bold text-[#0B2419]">13.5 oz Chắc Phom</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Nhuộm chàm</span>
                <span className="text-[15px] font-bold text-[#0B2419]">Rope Dyeing 8 Lớp</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">Đường may</span>
                <span className="text-[15px] font-bold text-[#0B2419]">Chỉ Dù 3 Kim Khóa Kép</span>
              </div>
            </div>
          </div>

          {/* RIGHT: 35% Sticky Commerce Purchase Panel */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-28 space-y-6 bg-white p-2">
            {/* Header Info & Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[#687069]">
                <span className="text-[11px] tracking-widest uppercase font-mono">{product.sku}</span>
                <div className="flex items-center gap-1.5 text-[#0B2419]">
                  <div className="flex text-[#E8C75B] text-[16px]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className="material-symbols-outlined text-[16px]">
                        star
                      </span>
                    ))}
                  </div>
                  <span className="text-[12px] font-bold">4.9</span>
                  <span className="text-[#687069] text-[12px]">(48 đánh giá)</span>
                </div>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#0B2419] tracking-tight font-normal">
                {product.name}
              </h1>
              <p className="text-[14px] text-[#424844] font-light leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Pricing Zone */}
            <div className="p-4 bg-[#FFFDF5] border border-[#E8E9E3] flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-2xl font-bold text-[#0B2419]">
                  {((product.price as number) || 0).toLocaleString('vi-VN')}₫
                </span>
                {product.originalPrice && (
                  <span className="text-[14px] text-[#687069] line-through font-mono">
                    {((product.originalPrice as number) || 0).toLocaleString('vi-VN')}₫
                  </span>
                )}
              </div>
              <span className="bg-[#E8C75B] text-[#101310] text-[10px] uppercase px-2.5 py-1 tracking-widest font-bold">
                TIẾT KIỆM -19%
              </span>
            </div>

            {/* Color Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase tracking-wider text-[#0B2419] font-bold">
                  MÀU SẮC: <span className="font-normal text-[#424844]">{selectedColor}</span>
                </span>
                <span className="text-[11px] text-[#725c00] font-semibold">Bền màu tự nhiên</span>
              </div>
              <div className="flex items-center gap-3">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    aria-label={c.name}
                    className="relative w-10 h-10 p-0.5 bg-white flex items-center justify-center transition-all focus:outline-none cursor-pointer"
                  >
                    <span
                      className={`w-full h-full block ${
                        selectedColor === c.name
                          ? 'ring-2 ring-[#0B2419] ring-offset-2'
                          : 'hover:ring-2 hover:ring-[#687069] hover:ring-offset-1'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    ></span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase tracking-wider text-[#0B2419] font-bold">
                  KÍCH CỠ: <span className="font-bold text-[#0B2419]">{selectedSize}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-[#1B5038] hover:text-[#0B2419] tracking-wider uppercase underline underline-offset-4 focus:outline-none cursor-pointer font-bold"
                >
                  <span className="material-symbols-outlined text-[16px]">straighten</span>
                  <span>HƯỚNG DẪN CHỌN KÍCH CỠ</span>
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`py-2.5 text-[13px] font-bold transition-colors focus:outline-none cursor-pointer border ${
                      selectedSize === sz
                        ? 'bg-[#0B2419] text-white border-[#0B2419]'
                        : 'bg-[#f3f4ef] text-[#0B2419] hover:bg-[#e7e9e3] border-[#E8E9E3]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
              {/* Stock Level Notification */}
              <div className="flex items-center gap-2 pt-1">
                <span className="w-2 h-2 rounded-full bg-[#1B5038] animate-pulse"></span>
                <p className="text-[13px] text-[#1B5038] font-medium">
                  Còn hàng ({product.inStockCount} chiếc tại Atelier Flagship TP.HCM)
                </p>
              </div>
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Quantity Box */}
                <div className="flex items-center bg-[#f3f4ef] h-12 px-2 border border-[#E8E9E3]">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-full flex items-center justify-center text-[#0B2419] hover:bg-[#e7e9e3] transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <input
                    type="text"
                    readOnly
                    value={quantity}
                    className="w-10 text-center bg-transparent text-[15px] font-bold text-[#0B2419] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-full flex items-center justify-center text-[#0B2419] hover:bg-[#e7e9e3] transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>

                {/* Primary Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 h-12 bg-[#0B2419] hover:bg-[#1B5038] text-white text-[12px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors focus:outline-none shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  <span>THÊM VÀO GIỎ HÀNG</span>
                </button>

                {/* Wishlist Heart Button */}
                <button
                  type="button"
                  aria-label="Thêm vào danh sách yêu thích"
                  onClick={() => toggleWishlist(product.id)}
                  className="w-12 h-12 bg-[#f3f4ef] hover:bg-[#e7e9e3] text-[#0B2419] flex items-center justify-center transition-colors focus:outline-none cursor-pointer border border-[#E8E9E3]"
                >
                  <span className={`material-symbols-outlined text-[22px] ${isFavorite ? 'text-[#ba1a1a]' : ''}`}>
                    favorite
                  </span>
                </button>
              </div>

              {/* Fast Checkout Buy Now */}
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full h-12 bg-transparent text-[#0B2419] text-[12px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-[#0B2419] hover:text-white transition-colors focus:outline-none ring-1 ring-[#0B2419] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>MUA NGAY - GIAO NHANH 24H</span>
              </button>
            </div>

            {/* Trust Badges & Guarantee Micro-cards */}
            <div className="space-y-3 pt-4 bg-white border-t border-[#E8E9E3]">
              <div className="flex items-start gap-3 p-3 bg-[#f3f4ef]">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px] shrink-0 mt-0.5">
                  storefront
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#0B2419]">
                    Hàng Có Sẵn Tại Cửa Hàng - Thử Đồ Trực Tiếp
                  </span>
                  <span className="text-[12px] text-[#424844]">
                    Sẵn toàn bộ các size tại showroom. Trải nghiệm không gian thử đồ cao cấp.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#f3f4ef]">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px] shrink-0 mt-0.5">
                  electric_bolt
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#0B2419]">
                    Giao Hàng Hỏa Tốc 2H Trong Nội Thành
                  </span>
                  <span className="text-[12px] text-[#424844]">
                    Đóng gói hộp quà cao cấp, nhận hàng ngay trong ngày tại TP.HCM &amp; Hà Nội.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#f3f4ef]">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px] shrink-0 mt-0.5">sync</span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#0B2419]">Đổi Size Tận Nhà 15 Ngày Miễn Phí</span>
                  <span className="text-[12px] text-[#424844]">
                    Shipper giao size mới và thu hồi size cũ tận nơi hoàn toàn miễn phí.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#f3f4ef]">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px] shrink-0 mt-0.5">
                  content_cut
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#0B2419]">Hỗ Trợ Cắt Gấu Lấy Liền 15 Phút</span>
                  <span className="text-[12px] text-[#424844]">
                    Thợ may tinh chỉnh gấu quần chuẩn giữ nguyên viền chỉ đỏ Selvedge tại showroom.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Section: Craftsmanship Accordion Details */}
      <section className="w-full px-4 sm:px-8 lg:px-14 py-12 lg:py-16 bg-[#f3f4ef] border-t border-[#E8E9E3]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
              Chế Tác Thủ Công Tinh Tuyển
            </span>
            <h2 className="font-serif text-3xl text-[#0B2419]">Đặc Điểm Kỹ Thuật &amp; Triết Lý Dệt</h2>
          </div>

          {/* Accordion Module */}
          <div className="space-y-3">
            {[
              {
                icon: 'architecture',
                title: 'Chi Tiết Thiết Kế & Phom Dáng Straight Fit',
                content: (
                  <>
                    <p>
                      Phom dáng Straight Fit (ống suông chuẩn 19cm) được điều chỉnh dựa trên số đo nhân trắc học của nam giới hiện đại, ôm nhẹ vừa vặn ở hông và mở đều xuống gấu quần để tạo hiệu ứng kéo dài đôi chân.
                    </p>
                    <p className="mt-2">
                      Cạp quần Mid-rise (cạp trung) thoải mái, phù hợp khi sơ vin cùng sơ mi Cuban hoặc thả buông áo dệt kim mềm. Đường may cuộn ba kim gia cường chịu lực tại các điểm giao cắt tăng tuổi thọ sản phẩm gấp 3 lần denim thông thường.
                    </p>
                  </>
                )
              },
              {
                icon: 'water_drop',
                title: 'Chất Liệu Denim 13.5 oz & Hướng Dẫn Bảo Quản',
                content: (
                  <>
                    <p>
                      Được dệt từ 100% sợi bông hữu cơ dài sợi (Extra-long Staple Cotton), mặt vải có kết cấu bông xốp nhẹ tự nhiên, thấm hút mồ hôi tối ưu khi di chuyển trong khí hậu nhiệt đới.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>Lần giặt đầu: Ngâm nước lạnh pha chút muối ăn hoặc giấm trắng trong 30 phút để cố định màu chàm.</li>
                      <li>Giặt mặt trái, chọn chế độ giặt nhẹ hoặc giặt tay với nước lạnh dưới 30°C.</li>
                      <li>Tránh vắt quá mạnh bằng máy và phơi tự nhiên trong bóng râm thoáng gió để bảo toàn nếp phom nguyên thủy.</li>
                    </ul>
                  </>
                )
              },
              {
                icon: 'history_edu',
                title: 'Câu Chuyện Nghệ Thuật Dệt Con Thoi Nhật Bản (Selvedge Heritage)',
                content: (
                  <>
                    <p>
                      Selvedge denim bắt nguồn từ từ "self-edge" – mép vải dệt tự động khóa mép kín khít từ những chiếc máy dệt con thoi Toyoda cổ điển từ thập niên 1960. Nhờ tốc độ dệt chậm rãi, từng sợi dệt có độ đàn hồi tự nhiên và tạo nên đường viền chỉ đỏ (Red-line Selvedge) trứ danh khi xắn gấu.
                    </p>
                    <p className="mt-2">
                      Theo thời gian mặc, các nếp gấp riêng biệt của người mặc sẽ mài mòn lớp chàm, tạo thành hiệu ứng phai màu (Fading &amp; Honeycombs) độc bản mang đậm dấu ấn cá nhân.
                    </p>
                  </>
                )
              }
            ].map((acc, index) => {
              const isOpen = openAccordions.includes(index);
              return (
                <div key={acc.title} className="bg-white border border-[#E8E9E3]">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full p-5 text-left flex items-center justify-between text-[16px] font-bold text-[#0B2419] focus:outline-none"
                  >
                    <span className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#1B5038] text-[22px]">{acc.icon}</span>
                      {acc.title}
                    </span>
                    <span
                      className={`material-symbols-outlined transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 text-[14px] text-[#424844] leading-relaxed border-t border-[#E8E9E3]/40">
                      {acc.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Complete The Look (Shop The Look) Section */}
      <section className="w-full px-4 sm:px-8 lg:px-14 py-12 lg:py-16 bg-white border-t border-[#E8E9E3]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
                Gợi Ý Mặc Đẹp Từ Stylist
              </span>
              <h2 className="font-serif text-3xl text-[#0B2419]">Phối Đồ Hoàn Chỉnh (Shop The Look)</h2>
            </div>
            <div className="bg-[#FAF4DF] px-4 py-2 text-[#0B2419] text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 border border-[#E8C75B]/30">
              <span className="material-symbols-outlined text-[#E8C75B]">sell</span>
              <span>Mua Cả Set • Giảm Thêm 10% Tự Động</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#FFFDF5] p-6 lg:p-10 border border-[#E8E9E3]">
            {/* Visual Presentation */}
            <div className="lg:col-span-6 relative aspect-[4/5] overflow-hidden group shadow-sm">
              <img
                alt="Editorial fashion lookbook portrait"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida/AEtjO1Xe0ZfnyMGDifmIcRIY6MesXslwYJAflnCSslJWmhCtS5Efgg7FtJVZUDruWjhEq2Mm2g3__DrURgDcss17EHhgZD8r-wAKOXuYrJ2HNfEuKOTDrc5klgZvwlJ-NyN_1hrNkhCkcXAXHEd7VATEhHtvYBW1OoRJXjfQ7dEepjxBkjCuKLgbPmspT1wXUKvX-NP60bKInOmWyEeLfXVoqt2AIqB9TOWtXFPP7-Q3tDK4FtgY1ssurNMDBzss"
              />
              <div className="absolute bottom-4 left-4 bg-[#071A12]/90 backdrop-blur-sm text-[#FFFDF5] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                Look 04 • The Urban Artisan
              </div>
            </div>

            {/* Coordinated Item Details */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] tracking-widest uppercase text-[#725c00] font-bold">
                  Sản Phẩm Đi Kèm Hoàn Hảo
                </span>
                <h3 className="font-serif text-2xl text-[#0B2419]">Áo Sơ Mi Cuban Collar Dark Smoke Linen</h3>
                <p className="text-[14px] text-[#424844] font-light leading-relaxed">
                  Dệt từ 100% sợi đay tự nhiên xử lý mềm mượt. Cổ áo ve lật retro phóng khoáng, tạo điểm rơi cân bằng hoàn mỹ cho chất vải denim đứng dáng.
                </p>
              </div>

              <div className="p-4 bg-white border border-[#E8E9E3] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-[#687069] block font-semibold">Giá mua kèm</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[18px] text-[#0B2419] font-bold font-mono">489.000₫</span>
                    <span className="text-[13px] text-[#687069] line-through font-mono">590.000₫</span>
                  </div>
                </div>
                <span className="bg-[#1B5038] text-white px-3 py-1 text-[11px] uppercase tracking-wider font-bold">
                  Ưu Đãi Combo
                </span>
              </div>

              {/* Total Calculation Strip */}
              <div className="p-4 bg-[#FAF4DF] space-y-2 border border-[#E8C75B]/30">
                <div className="flex items-center justify-between text-[13px] text-[#0B2419]">
                  <span>Combo: Quần Jean Selvedge + Sơ Mi Cuban</span>
                  <span className="font-bold font-mono">1.178.000₫</span>
                </div>
                <div className="flex items-center justify-between text-[#1B5038] text-[13px]">
                  <span>Tiết kiệm gói đồng bộ (-10%):</span>
                  <span className="font-bold font-mono">-117.800₫</span>
                </div>
                <div className="pt-2 border-t border-[#E8E9E3] flex items-center justify-between text-[#0B2419]">
                  <span className="font-bold text-[14px]">Tổng thanh toán combo:</span>
                  <span className="font-serif text-2xl font-bold text-[#0B2419] font-mono">1.060.200₫</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCombo}
                className="w-full h-12 bg-[#0B2419] hover:bg-[#1B5038] text-white text-[12px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors focus:outline-none shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                <span>THÊM CẢ BỘ VÀO GIỎ HÀNG</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Collection Showcase Banner */}
      <section className="w-full px-4 sm:px-8 lg:px-14 py-6 max-w-7xl mx-auto">
        <div className="relative w-full h-80 lg:h-96 overflow-hidden rounded-lg">
          <img
            alt="High-end fashion editorial campaign"
            className="w-full h-full object-cover brightness-90"
            src="https://lh3.googleusercontent.com/aida/AEtjO1VqsaQLdPp92eZntUyPitJZrmjLtOfyz7qxY7gw7OsqcB_rVvoYhOafBkyUcqd0mE_Za4wovFWFEjBaSjcJhC2QD88JhgAwWGyjVvId6JCCIYPX6oQjeWqTnka560rT_ngDar1cVSQxKIJn2P3kquFJZY_wiWk9YYUs81YWPa_o7yzCFzl6NDlhdXm0sgdmXntX4uWOQnOJ397g3Q4MDVo0hshEbbRuKcF8y9TH29KsOqiIYNQKE744zxLA"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071A12]/90 via-[#071A12]/40 to-transparent flex flex-col justify-end p-6 lg:p-12 text-[#FFFDF5]">
            <span className="text-[11px] uppercase tracking-widest text-[#E8C75B] font-bold">
              Chiến Dịch Mùa Thu - Đông 2025
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl tracking-tight max-w-xl mt-1">
              Sự Tĩnh Lặng Của Dòng Trang Phục Sẵn Có &amp; Denim Nguyên Bản
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[#e1e3de] max-w-lg mt-2">
              Mỗi cấu trúc trang phục đều tôn vinh lối sống tinh tế, tiết chế phô trương để hướng về giá trị bền vững của chất liệu thiên nhiên.
            </p>
          </div>
        </div>
      </section>

      {/* Recommended Products (Bạn Có Thể Thích) */}
      <section className="w-full px-4 sm:px-8 lg:px-14 py-12 lg:py-16 bg-white max-w-7xl mx-auto border-t border-[#E8E9E3]">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
                Gợi Ý Riêng Dành Cho Bạn
              </span>
              <h2 className="font-serif text-3xl text-[#0B2419]">Sản Phẩm Cùng Bộ Sưu Tập</h2>
            </div>
            <button
              onClick={() => {
                setCurrentScreen('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-[12px] text-[#0B2419] hover:text-[#1B5038] tracking-widest uppercase font-bold flex items-center gap-1"
            >
              <span>Xem Tất Cả</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(2, 6).map((rec: any) => (
              <div
                key={rec.id}
                onClick={() => {
                  setSelectedProductId(rec.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group flex flex-col space-y-2 cursor-pointer border border-[#E8E9E3] p-3 hover:border-[#0B2419] transition-colors"
              >
                <div className="relative aspect-[3/4] bg-[#f3f4ef] overflow-hidden">
                  <img
                    alt={rec.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={rec.imageUrl}
                  />
                  {rec.statusBadge && (
                    <span className="absolute top-2 left-2 bg-white text-[#0B2419] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-sm">
                      {rec.statusBadge}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase text-[#687069] font-semibold">{rec.category}</span>
                  <h4 className="text-[13px] font-bold text-[#0B2419] group-hover:underline truncate">{rec.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#0B2419] font-mono">
                      {((rec.price as number) || 0).toLocaleString('vi-VN')}₫
                    </span>
                    {rec.originalPrice && (
                      <span className="text-[11px] text-[#687069] line-through font-mono">
                        {((rec.originalPrice as number) || 0).toLocaleString('vi-VN')}₫
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Size Guide Modal */}
      {isSizeGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-sm"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white max-w-2xl w-full p-6 lg:p-8 space-y-6 relative shadow-2xl rounded-lg animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                  Atelier Vert Measurement Matrix
                </span>
                <h3 className="font-serif text-2xl text-[#0B2419]">
                  Bảng Size Chuẩn Nam Giới (Có Sẵn Size 28 - 34)
                </h3>
              </div>
              <button
                aria-label="Đóng bảng kích cỡ"
                onClick={() => setIsSizeGuideOpen(false)}
                className="text-[#0B2419] hover:text-[#1B5038] p-2 focus:outline-none"
                type="button"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Size Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#FAF4DF] text-[#0B2419] font-bold uppercase text-[11px]">
                    <th className="p-3">Size</th>
                    <th className="p-3">Vòng Eo (cm)</th>
                    <th className="p-3">Vòng Mông (cm)</th>
                    <th className="p-3">Rộng Ống (cm)</th>
                    <th className="p-3">Chiều Dài (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3] text-[#191c19]">
                  {[
                    { sz: '29', eo: '74 - 76', mong: '92 - 94', ong: '18.5', dai: '99' },
                    { sz: '30', eo: '77 - 79', mong: '95 - 97', ong: '18.5', dai: '100' },
                    { sz: '31 (Đang Chọn)', eo: '80 - 82', mong: '98 - 100', ong: '19.0', dai: '101', active: true },
                    { sz: '32', eo: '83 - 85', mong: '101 - 103', ong: '19.0', dai: '102' },
                    { sz: '33', eo: '86 - 88', mong: '104 - 106', ong: '19.5', dai: '103' },
                    { sz: '34', eo: '89 - 91', mong: '107 - 109', ong: '20.0', dai: '104' }
                  ].map((row) => (
                    <tr
                      key={row.sz}
                      className={row.active ? 'bg-[#FAF4DF]/60 font-bold text-[#0B2419]' : 'hover:bg-[#FFFDF5]'}
                    >
                      <td className="p-3 font-bold text-[#0B2419]">{row.sz}</td>
                      <td className="p-3">{row.eo}</td>
                      <td className="p-3">{row.mong}</td>
                      <td className="p-3">{row.ong}</td>
                      <td className="p-3">{row.dai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick Fit Calculator */}
            <div className="p-4 bg-[#f3f4ef] space-y-2 border border-[#E8E9E3]">
              <span className="text-[12px] uppercase tracking-wider text-[#0B2419] font-bold block">
                Tư Vấn Nhanh Theo Chiều Cao &amp; Cân Nặng
              </span>
              <p className="text-[13px] text-[#424844] leading-relaxed">
                Ví dụ: 1m72 - 1m76, nặng 64kg - 68kg chọn ngay <strong className="text-[#0B2419]">Size 31</strong> để có độ ôm vừa vặn, không cần thắt dây nịt. Quần có độ co giãn vi mô 1% sau 3 lần mặc.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
