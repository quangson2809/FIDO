import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import { mockBrands, mockCategories, mockProductDetails } from '../mocks/apiData';
import { toUiProduct } from '../mocks/uiData';
import { Product } from '../types';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const HomeScreen: React.FC = () => {
  const {
    setCurrentScreen,
    setSelectedProductId,
    addToCart,
    wishlist,
    toggleWishlist,
  } = useApp();

  const [products, setProducts] = useState<Array<Product & { product_id: number }>>([]);
  const [rootCategory, setRootCategory] = useState<number | 'ALL'>('ALL');
  const [brand, setBrand] = useState('ALL');

  React.useEffect(() => {
    catalogService.getProducts().then((items)=>setProducts(items.map(toUiProduct)));
  }, []);

  const rootCategories = mockCategories.filter((item)=>item.parent_category_id===null);
  const categoryById = new Map(mockCategories.map((item)=>[item.category_id,item]));

  const filteredProducts = useMemo(()=>products.filter((product)=>{
    const raw = mockProductDetails.find((item)=>item.product_id===product.product_id);
    if (!raw) return false;
    if (rootCategory !== 'ALL') {
      const leaf = categoryById.get(raw.category.category_id);
      if (leaf?.parent_category_id !== rootCategory) return false;
    }
    if (brand !== 'ALL' && raw.brand?.name !== brand) return false;
    return true;
  }),[products,rootCategory,brand]);

  const totalVariants = mockProductDetails.reduce((sum, product)=>sum+product.variants.length,0);
  const totalAvailable = mockProductDetails.reduce(
    (sum, product)=>sum+product.variants.reduce((inner,variant)=>inner+variant.available_quantity,0),
    0,
  );

  const openProduct = (id: string) => {
    setSelectedProductId(id);
    setCurrentScreen('product-detail');
    window.scrollTo({top:0,behavior:'smooth'});
  };

  return (
    <div className="bg-[#F8FAF4] min-h-screen">
      <section className="bg-[#0B2419] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#E8C75B]">
              <span className="w-2 h-2 rounded-full bg-[#E8C75B]" />
              Frontend mock · Catalog v1.3
            </div>
            <h1 className="font-['Playfair_Display',serif] text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
              Test toàn bộ trải nghiệm mua sắm bằng dữ liệu đồng nhất.
            </h1>
            <p className="text-sm sm:text-base text-white/70 max-w-2xl mt-5 leading-relaxed">
              Product, Variant, SizeValue, Color, Cart, Order, COD và Inventory đều dùng chung một bộ mock contract để tránh dữ liệu rời rạc giữa các trang.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button onClick={()=>setCurrentScreen('catalog')} className="px-6 py-3 bg-[#E8C75B] text-[#071A12] text-xs uppercase tracking-wider font-bold rounded">
                Mở catalog mock
              </button>
              <button onClick={()=>setCurrentScreen('my-orders')} className="px-6 py-3 border border-white/30 text-white text-xs uppercase tracking-wider font-bold rounded">
                Test trạng thái đơn
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Product', products.length, 'inventory_2'],
              ['Variant', totalVariants, 'view_in_ar'],
              ['Available', totalAvailable, 'warehouse'],
              ['Phí giao mặc định', '30.000₫', 'local_shipping'],
            ].map(([label,value,icon])=>(
              <div key={String(label)} className="bg-white/8 border border-white/10 backdrop-blur-sm rounded-xl p-5">
                <span className="material-symbols-outlined text-[#E8C75B]">{icon}</span>
                <div className="text-2xl font-bold mt-3">{value}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/55 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['COD duy nhất','PaymentStatus tách độc lập OrderStatus','payments'],
            ['Guest checkout','Khách không cần tài khoản để tạo đơn','person_off'],
            ['Một kho','Inventory theo variant, không đa kho','warehouse'],
            ['Đổi / hoàn 02 ngày','Từ COMPLETED, theo điều kiện nhãn/mác','assignment_return'],
          ].map(([title,description,icon])=>(
            <div key={String(title)} className="bg-white border border-[#E2E5DE] rounded-lg p-5">
              <span className="material-symbols-outlined text-[#1B5038]">{icon}</span>
              <div className="font-bold text-[#0B2419] mt-3">{title}</div>
              <p className="text-xs text-[#687069] mt-1 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white border border-[#E2E5DE] rounded-xl p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B5038]">CatalogMetaDto</div>
              <h2 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Lọc dữ liệu ngay trên trang chủ</h2>
            </div>
            <button onClick={()=>{setRootCategory('ALL');setBrand('ALL');}} className="px-3 py-2 border rounded text-xs font-bold">Reset filter</button>
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#687069] mb-2">Category cha</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setRootCategory('ALL')} className={`px-3 py-2 rounded text-xs font-bold ${rootCategory==='ALL'?'bg-[#0B2419] text-white':'bg-[#F5F6F2]'}`}>Tất cả</button>
              {rootCategories.map((item)=>(
                <button key={item.category_id} onClick={()=>setRootCategory(item.category_id)} className={`px-3 py-2 rounded text-xs font-bold ${rootCategory===item.category_id?'bg-[#0B2419] text-white':'bg-[#F5F6F2]'}`}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#687069] mb-2">Brand</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setBrand('ALL')} className={`px-3 py-2 rounded text-xs font-bold ${brand==='ALL'?'bg-[#E8C75B] text-[#071A12]':'bg-[#F5F6F2]'}`}>Tất cả</button>
              {mockBrands.map((item)=>(
                <button key={item.brand_id} onClick={()=>setBrand(item.name)} className={`px-3 py-2 rounded text-xs font-bold ${brand===item.name?'bg-[#E8C75B] text-[#071A12]':'bg-[#F5F6F2]'}`}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B5038]">ProductDetailDto fixtures</div>
            <h2 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Sản phẩm để test</h2>
          </div>
          <button onClick={()=>setCurrentScreen('catalog')} className="text-xs font-bold text-[#1B5038]">Xem toàn bộ →</button>
        </div>

        {filteredProducts.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.slice(0,6).map((product)=>{
              const favorite = wishlist.includes(product.id);
              return (
                <article key={product.id} className="bg-white border border-[#E2E5DE] rounded-lg overflow-hidden group">
                  <button type="button" onClick={()=>openProduct(product.id)} className="block w-full aspect-[4/5] bg-[#F3F4EF] overflow-hidden">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"/>
                  </button>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-[#687069] uppercase tracking-wider">{product.category} · {product.brand}</div>
                        <button type="button" onClick={()=>openProduct(product.id)} className="text-left font-bold text-[#0B2419] mt-1">{product.name}</button>
                      </div>
                      <button type="button" onClick={()=>toggleWishlist(product.id)}><span className="material-symbols-outlined text-[20px]">{favorite?'favorite':'favorite_border'}</span></button>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div><div className="font-bold text-lg">{money(product.price)}</div><div className="text-[10px] text-[#687069]">available {product.inStockCount}</div></div>
                      <button type="button" onClick={()=>addToCart(product)} className="px-3 py-2 bg-[#0B2419] text-white text-[10px] uppercase font-bold rounded">Thêm giỏ</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E5DE] rounded-lg p-10 text-center text-sm text-[#687069]">Không có sản phẩm phù hợp filter mock.</div>
        )}
      </section>
    </div>
  );
};
