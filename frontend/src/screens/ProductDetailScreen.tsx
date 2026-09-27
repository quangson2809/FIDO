import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import { ProductDetailDto } from '../mocks/apiData';
import { toUiProduct } from '../mocks/uiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const ProductDetailScreen: React.FC = () => {
  const {
    selectedProductId,
    addToCart,
    wishlist,
    toggleWishlist,
    setCurrentScreen,
    setIsCartOpen,
  } = useApp();

  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [related, setRelated] = useState<ProductDetailDto[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const productId = Number(selectedProductId);
    Promise.all([
      catalogService.getProductById(productId),
      catalogService.getProducts(),
    ]).then(([detail, all]) => {
      setProduct(detail);
      setSelectedVariantId(detail.variants[0]?.variant_id ?? null);
      setActiveImageIndex(0);
      setQuantity(1);
      setRelated(all.filter((item)=>item.product_id !== detail.product_id).slice(0, 3));
    }).catch(() => {
      setProduct(null);
      setRelated([]);
    });
  }, [selectedProductId]);

  const selectedVariant = useMemo(
    () => product?.variants.find((variant)=>variant.variant_id===selectedVariantId) ?? product?.variants[0],
    [product, selectedVariantId],
  );

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <span className="material-symbols-outlined text-5xl text-[#0B2419]/25">inventory_2</span>
        <p className="mt-3 text-sm font-bold text-[#0B2419]">Không tìm thấy ProductDetailDto mock.</p>
        <button onClick={()=>setCurrentScreen('catalog')} className="mt-4 px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">Quay lại catalog</button>
      </div>
    );
  }

  const uiProduct = toUiProduct(product);
  const images = product.images.length ? product.images : [{ image_id: 0, image_url: uiProduct.imageUrl, alt_text: product.name }];
  const favorite = wishlist.includes(String(product.product_id));
  const canBuy = Boolean(selectedVariant && selectedVariant.sale_status === 'ACTIVE' && selectedVariant.available_quantity > 0);

  const add = (openCart = false) => {
    if (!selectedVariant || !canBuy) return;
    addToCart(uiProduct, selectedVariant.size.display_name, selectedVariant.color.name, quantity);
    if (openCart) setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF4]">
      <div className="border-b border-[#E2E5DE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-2 text-xs text-[#687069]">
          <button onClick={()=>setCurrentScreen('home')} className="hover:text-[#0B2419]">Trang chủ</button>
          <span>/</span>
          <button onClick={()=>setCurrentScreen('catalog')} className="hover:text-[#0B2419]">{product.category.name}</button>
          <span>/</span>
          <span className="font-bold text-[#0B2419] truncate">{product.name}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-start">
          <section>
            <div className="bg-white border border-[#E2E5DE] rounded-lg overflow-hidden aspect-[4/5]">
              <img
                src={images[activeImageIndex]?.image_url}
                alt={images[activeImageIndex]?.alt_text ?? product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 mt-3">
                {images.map((image, index)=>(
                  <button
                    key={image.image_id}
                    type="button"
                    onClick={()=>setActiveImageIndex(index)}
                    className={`aspect-square border rounded overflow-hidden ${activeImageIndex===index?'border-[#0B2419] ring-1 ring-[#0B2419]':'border-[#E2E5DE]'}`}
                  >
                    <img src={image.image_url} alt={image.alt_text ?? product.name} className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="lg:sticky lg:top-20 space-y-5">
            <div className="bg-white border border-[#E2E5DE] rounded-lg p-5 sm:p-6">
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B5038]">ProductDetailDto #{product.product_id}</div>
              <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold text-[#0B2419] mt-2">{product.name}</h1>
              <div className="text-xs text-[#687069] mt-2">
                {product.category.name} · {product.brand?.name ?? 'Không brand'} · sale_status: <strong>{product.sale_status}</strong>
              </div>
              {product.description && <p className="text-sm text-[#424844] leading-relaxed mt-4">{product.description}</p>}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 text-xs">
                <div className="bg-[#F5F6F2] p-3 rounded"><span className="text-[#687069] block">Gender</span><strong>{product.gender ?? '—'}</strong></div>
                <div className="bg-[#F5F6F2] p-3 rounded"><span className="text-[#687069] block">Season</span><strong>{product.season ?? '—'}</strong></div>
                <div className="bg-[#F5F6F2] p-3 rounded"><span className="text-[#687069] block">Style</span><strong>{product.style ?? '—'}</strong></div>
                <div className="bg-[#F5F6F2] p-3 rounded"><span className="text-[#687069] block">Base price</span><strong>{money(product.base_price)}</strong></div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E5DE] rounded-lg p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[#0B2419]">Chọn variant</h2>
                  <p className="text-[11px] text-[#687069] mt-1">Product + SizeValue + Color là identity variant trong baseline.</p>
                </div>
                <button type="button" onClick={()=>toggleWishlist(String(product.product_id))} className="p-2 border rounded">
                  <span className="material-symbols-outlined text-[20px]">{favorite?'favorite':'favorite_border'}</span>
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                {product.variants.map((variant)=>(
                  <button
                    key={variant.variant_id}
                    type="button"
                    onClick={()=>setSelectedVariantId(variant.variant_id)}
                    className={`p-3 border rounded text-left flex items-center justify-between gap-4 ${selectedVariant?.variant_id===variant.variant_id?'border-[#0B2419] bg-[#FAF4DF]':'border-[#E2E5DE] hover:bg-[#FAF9F5]'}`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0B2419]">{variant.size.display_name} · {variant.color.name}</div>
                      <div className="text-[10px] text-[#687069] mt-1">{variant.sku ?? 'Không SKU'} · variant_id #{variant.variant_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{money(variant.effective_price)}</div>
                      <div className={`text-[10px] ${variant.available_quantity>0?'text-[#1B5038]':'text-[#BA1A1A]'}`}>available {variant.available_quantity}</div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedVariant && (
                <div className="mt-5 p-4 bg-[#F5F6F2] rounded text-xs">
                  <div className="flex justify-between"><span>Size system</span><strong>{product.size_system.code}</strong></div>
                  <div className="flex justify-between mt-2"><span>Variant sale_status</span><strong>{selectedVariant.sale_status}</strong></div>
                  <div className="flex justify-between mt-2"><span>Effective price</span><strong>{money(selectedVariant.effective_price)}</strong></div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <div className="inline-flex border rounded overflow-hidden">
                  <button type="button" onClick={()=>setQuantity((value)=>Math.max(1,value-1))} className="w-10 h-11 bg-white hover:bg-[#F5F6F2]">−</button>
                  <div className="w-10 h-11 flex items-center justify-center text-sm font-bold">{quantity}</div>
                  <button
                    type="button"
                    onClick={()=>setQuantity((value)=>Math.min(selectedVariant?.available_quantity ?? 1,value+1))}
                    className="w-10 h-11 bg-white hover:bg-[#F5F6F2]"
                  >
                    +
                  </button>
                </div>
                <button disabled={!canBuy} type="button" onClick={()=>add(false)} className="flex-1 h-11 bg-[#0B2419] disabled:opacity-40 text-white text-xs uppercase tracking-wider font-bold rounded">
                  Thêm vào giỏ
                </button>
                <button disabled={!canBuy} type="button" onClick={()=>add(true)} className="h-11 px-4 border border-[#0B2419] disabled:opacity-40 text-[#0B2419] text-xs font-bold rounded">
                  Mở giỏ
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#E2E5DE] rounded-lg p-5 sm:p-6">
              <h2 className="font-bold text-[#0B2419]">Material / care</h2>
              <p className="text-sm text-[#687069] mt-2">{product.material_care ?? 'Không có dữ liệu material_care.'}</p>
            </div>
          </section>
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#1B5038]">Fixture liên quan</div>
              <h2 className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] mt-1">Sản phẩm khác</h2>
            </div>
            <button onClick={()=>setCurrentScreen('catalog')} className="text-xs font-bold text-[#1B5038]">Xem catalog</button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
            {related.map((item)=>{
              const card = toUiProduct(item);
              return (
                <button
                  key={item.product_id}
                  type="button"
                  onClick={()=>{
                    setSelectedProductId(String(item.product_id));
                    window.scrollTo({top:0,behavior:'smooth'});
                  }}
                  className="bg-white border border-[#E2E5DE] rounded-lg overflow-hidden text-left"
                >
                  <img src={card.imageUrl} alt={item.name} className="w-full aspect-[4/3] object-cover bg-[#F3F4EF]"/>
                  <div className="p-4"><div className="font-bold text-[#0B2419]">{item.name}</div><div className="text-xs text-[#687069] mt-1">{item.category.name} · {item.brand?.name ?? '—'}</div><div className="text-sm font-bold mt-2">{money(card.price)}</div></div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
