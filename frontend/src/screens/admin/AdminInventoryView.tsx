import React, { useState } from 'react';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  color: string;
  size: string;
  inStock: number;
  reserved: number; // Đang giữ cho khách may lên gấu
  available: number;
  reorderPoint: number;
  warehouse: string;
  status: 'OPTIMAL' | 'LOW' | 'CRITICAL';
}

export const AdminInventoryView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: 'INV-01',
      sku: 'FID-JNS-SEL-30',
      name: 'Quần Jeans Selvedge 14oz Cổ Điển',
      category: 'Quần Jeans',
      color: 'Indigo Đậm',
      size: '30',
      inStock: 45,
      reserved: 6,
      available: 39,
      reorderPoint: 15,
      warehouse: 'Kho Chính Hà Nội',
      status: 'OPTIMAL',
    },
    {
      id: 'INV-02',
      sku: 'FID-JNS-SEL-32',
      name: 'Quần Jeans Selvedge 14oz Cổ Điển',
      category: 'Quần Jeans',
      color: 'Indigo Đậm',
      size: '32',
      inStock: 12,
      reserved: 5,
      available: 7,
      reorderPoint: 15,
      warehouse: 'Kho Chính Hà Nội',
      status: 'LOW',
    },
    {
      id: 'INV-03',
      sku: 'FID-SHR-CUB-M',
      name: 'Áo Sơ Mi Lụa Cổ Cuban',
      category: 'Áo Sơ Mi',
      color: 'Xanh Rêu Atelier',
      size: 'M',
      inStock: 38,
      reserved: 2,
      available: 36,
      reorderPoint: 10,
      warehouse: 'Showroom Lý Tự Trọng (HCM)',
      status: 'OPTIMAL',
    },
    {
      id: 'INV-04',
      sku: 'FID-POL-KNT-L',
      name: 'Áo Polo Dệt Kim Cotton Mercerized',
      category: 'Áo Polo',
      color: 'Kem Vani',
      size: 'L',
      inStock: 4,
      reserved: 2,
      available: 2,
      reorderPoint: 12,
      warehouse: 'Showroom Lý Tự Trọng (HCM)',
      status: 'CRITICAL',
    },
    {
      id: 'INV-05',
      sku: 'FID-PNT-GUR-31',
      name: 'Quần Âu Gurkha Cạp Cao Xếp Ly',
      category: 'Quần Âu',
      color: 'Khaki Cát',
      size: '31',
      inStock: 28,
      reserved: 8,
      available: 20,
      reorderPoint: 10,
      warehouse: 'Xưởng May Atelier Vert',
      status: 'OPTIMAL',
    },
    {
      id: 'INV-06',
      sku: 'FID-BLZ-LIN-48',
      name: 'Áo Blazer Linen Ý Cấu Trúc Nhẹ',
      category: 'Áo Khoác',
      color: 'Xanh Navy Sẫm',
      size: '48',
      inStock: 8,
      reserved: 1,
      available: 7,
      reorderPoint: 8,
      warehouse: 'Kho Chính Hà Nội',
      status: 'LOW',
    },
  ]);

  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Nhập bổ sung lô may xưởng');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWh = warehouseFilter === 'all' || item.warehouse === warehouseFilter;
    return matchesSearch && matchesWh;
  });

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === adjustingItem.id
          ? {
              ...item,
              inStock: item.inStock + adjustQty,
              available: item.available + adjustQty,
              status:
                item.inStock + adjustQty <= item.reorderPoint / 2
                  ? 'CRITICAL'
                  : item.inStock + adjustQty <= item.reorderPoint
                  ? 'LOW'
                  : 'OPTIMAL',
            }
          : item
      )
    );
    showToast(
      `Đã cập nhật tồn kho cho SKU ${adjustingItem.sku}: ${adjustQty > 0 ? '+' : ''}${adjustQty} sp (${adjustReason})`
    );
    setAdjustingItem(null);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>Kho vận toàn quốc &bull; 3 địa điểm luân chuyển</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
            Quản Lý Tồn Kho &amp; Luân Chuyển Xưởng May
          </h1>
          <p className="text-sm text-[#424844] max-w-3xl">
            Theo dõi tồn kho thực tế, số lượng đang được thợ may giữ lại để lên gấu cho khách và kiểm soát cảnh báo hết hàng tự động.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Đang kết nối hệ thống kiểm kê barcode kho...')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#0B2419] hover:bg-[#FAF9F5] transition-colors text-xs font-semibold uppercase tracking-wider rounded border border-[#E8E9E3] shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            <span>Quét Mã Vạch</span>
          </button>
          <button
            onClick={() => showToast('Mở phiếu tạo đợt nhập xưởng may đo mới')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] text-white hover:bg-[#1B5038] transition-colors text-xs font-semibold uppercase tracking-wider rounded shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            <span>Tạo Phiếu Nhập Kho</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#687069]">
            Tổng Sản Phẩm Trong Kho
          </span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            1,248 <span className="text-xs font-sans font-normal text-[#687069]">sản phẩm</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">Sẵn sàng xuất giao COD ngay</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#725C00]">
            Đang Giữ Lại Để May Lên Gấu
          </span>
          <div className="mt-2 text-3xl font-bold text-[#725C00] font-['Playfair_Display',serif]">
            24 <span className="text-xs font-sans font-normal text-[#687069]">chiếc tại xưởng</span>
          </div>
          <div className="mt-2 text-xs text-[#687069]">Đang trong chu trình cắt may miễn phí</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#BA1A1A]">
            Cảnh Báo Sắp Hết Hàng (Low Stock)
          </span>
          <div className="mt-2 text-3xl font-bold text-[#BA1A1A] font-['Playfair_Display',serif]">
            5 <span className="text-xs font-sans font-normal text-[#687069]">SKU dưới định mức</span>
          </div>
          <div className="mt-2 text-xs text-[#BA1A1A] font-medium">Cần đặt thêm vải và phụ liệu</div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#F0F2ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#687069]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm mã SKU, tên sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF9F5] border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
              />
            </div>

            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-[#FAF9F5] border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
            >
              <option value="all">Tất cả kho hàng (3 kho)</option>
              <option value="Kho Chính Hà Nội">Kho Chính Hà Nội</option>
              <option value="Showroom Lý Tự Trọng (HCM)">Showroom Lý Tự Trọng (HCM)</option>
              <option value="Xưởng May Atelier Vert">Xưởng May Atelier Vert</option>
            </select>
          </div>

          <div className="text-xs text-[#687069]">
            Hiển thị <strong>{filteredItems.length}</strong> mặt hàng
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#424844]">
            <thead className="bg-[#FAF9F5] text-[#687069] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8E9E3]">
              <tr>
                <th className="py-3 px-4">Mã SKU &amp; Sản Phẩm</th>
                <th className="py-3 px-4">Quy Cách</th>
                <th className="py-3 px-4">Kho Lưu Trữ</th>
                <th className="py-3 px-4 text-center">Tồn Thực</th>
                <th className="py-3 px-4 text-center">Đang Cắt May</th>
                <th className="py-3 px-4 text-center">Có Thể Bán</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Điều Chỉnh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2ED]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-[#0B2419]">{item.sku}</div>
                    <div className="font-medium text-[#191C19]">{item.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[#687069]">{item.color}</span> &bull;{' '}
                    <span className="font-bold text-[#0B2419]">Size {item.size}</span>
                  </td>
                  <td className="py-3 px-4 text-[#687069]">{item.warehouse}</td>
                  <td className="py-3 px-4 text-center font-bold text-[#0B2419]">{item.inStock}</td>
                  <td className="py-3 px-4 text-center font-semibold text-[#725C00]">
                    {item.reserved > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-[#E5C358]/20 px-2 py-0.5 rounded text-[11px]">
                        <span className="material-symbols-outlined text-[12px]">content_cut</span>
                        {item.reserved}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#1B5038] text-sm">
                    {item.available}
                  </td>
                  <td className="py-3 px-4">
                    {item.status === 'OPTIMAL' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1B5038]/10 text-[#1B5038]">
                        ĐỦ HÀNG
                      </span>
                    )}
                    {item.status === 'LOW' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5C358]/30 text-[#725C00]">
                        SẮP HẾT
                      </span>
                    )}
                    {item.status === 'CRITICAL' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#BA1A1A]/10 text-[#BA1A1A]">
                        BÁO ĐỘNG ĐỎ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setAdjustingItem(item);
                        setAdjustQty(0);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0B2419] hover:bg-[#0B2419]/5 rounded border border-[#E8E9E3]"
                    >
                      Kiểm kê
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Adjust Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E9E3] max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F2ED] pb-3">
              <h3 className="font-bold text-base text-[#0B2419]">Kiểm Kê &amp; Điều Chỉnh Tồn Kho</h3>
              <button
                onClick={() => setAdjustingItem(null)}
                className="text-[#687069] hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="text-xs space-y-1 bg-[#FAF9F5] p-3 rounded border border-[#E8E9E3]">
              <div className="font-bold text-[#0B2419]">{adjustingItem.name}</div>
              <div className="text-[#687069]">
                SKU: <span className="font-mono">{adjustingItem.sku}</span> &bull; {adjustingItem.color} - Size {adjustingItem.size}
              </div>
              <div className="text-[#687069]">Hiện tại: <strong>{adjustingItem.inStock}</strong> chiếc trong kho</div>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0B2419] mb-1">
                  Số lượng thay đổi (dương là nhập thêm, âm là xuất bớt)
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419] font-bold text-base"
                />
                <p className="text-[11px] text-[#687069] mt-1">
                  Tồn kho mới sau điều chỉnh: <strong>{adjustingItem.inStock + adjustQty}</strong> chiếc
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#0B2419] mb-1">Lý do điều chỉnh</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
                >
                  <option value="Nhập bổ sung lô may xưởng">Nhập bổ sung lô may xưởng</option>
                  <option value="Điều chuyển sang Showroom HCM">Điều chuyển sang Showroom HCM</option>
                  <option value="Khách trả hàng đổi size COD">Khách trả hàng đổi size COD</option>
                  <option value="Hàng mẫu trưng bày &amp; chụp ảnh">Hàng mẫu trưng bày &amp; chụp ảnh</option>
                  <option value="Hư hỏng / Lỗi vải cần thanh lý">Hư hỏng / Lỗi vải cần thanh lý</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 border border-[#E8E9E3] rounded text-[#687069] hover:bg-[#FAF9F5]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2419] text-[#E5C358] font-bold rounded hover:bg-[#123A29]"
                >
                  Cập Nhật Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
