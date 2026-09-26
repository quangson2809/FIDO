import React, { useState } from 'react';

interface VoucherItem {
  id: string;
  code: string;
  discount: string;
}

export const AdminVouchersView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([
    { id: 'VCH-01', code: 'ABC123', discount: '50.000 ₫' },
    { id: 'VCH-02', code: 'SALE2026', discount: '100.000 ₫' },
    { id: 'VCH-03', code: 'SUMMER2026', discount: '150.000 ₫' },
    { id: 'VCH-04', code: 'VIPATELIER', discount: '200.000 ₫' },
    { id: 'VCH-05', code: 'DENIMPREMIUM', discount: '250.000 ₫' },
  ]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherItem | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDiscount, setEditDiscount] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    const cleanCode = newCode.trim().toUpperCase();
    const cleanDiscount = newDiscount.trim() || '50.000 ₫';
    const newVch: VoucherItem = {
      id: `VCH-${Date.now().toString().slice(-4)}`,
      code: cleanCode,
      discount: cleanDiscount,
    };
    setVouchers([newVch, ...vouchers]);
    setCreateModalOpen(false);
    setNewCode('');
    setNewDiscount('');
    showToast(`Đã gửi POST /api/v1/admin/vouchers: Tạo mới mã "${cleanCode}" thành công (${cleanDiscount})`);
  };

  const openEditModal = (v: VoucherItem) => {
    setEditingVoucher(v);
    setEditCode(v.code);
    setEditDiscount(v.discount);
    setEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher || !editCode.trim()) return;
    const cleanCode = editCode.trim().toUpperCase();
    const cleanDiscount = editDiscount.trim() || '50.000 ₫';

    setVouchers(
      vouchers.map((v) =>
        v.id === editingVoucher.id ? { ...v, code: cleanCode, discount: cleanDiscount } : v
      )
    );
    setEditModalOpen(false);
    showToast(`Đã gửi PATCH /api/v1/admin/vouchers/${editingVoucher.id}: Đổi thành mã "${cleanCode}" (${cleanDiscount})`);
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header / Action Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#E5C358]"></span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#687069]">
              Chương trình ưu đãi
            </span>
          </div>
          <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-normal text-[#0B2419]">
            Quản lý Voucher
          </h1>
          <p className="text-xs sm:text-sm text-[#687069] max-w-2xl">
            Xem danh sách và quản lý mã voucher ưu đãi trong hệ thống Atelier Vert.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B2419] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1B5038] transition-colors rounded shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Tạo voucher</span>
          </button>
        </div>
      </div>

      {/* Full-width Minimal Data Table */}
      <div className="w-full bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 bg-[#f3f4ef] flex items-center justify-between border-b border-[#E8E9E3]">
          <div className="flex items-center gap-2 text-[#0B2419]">
            <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
            <span className="font-bold text-sm text-[#0B2419]">Danh sách mã phát hành</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069] bg-white px-2.5 py-1 rounded shadow-xs border border-[#E8E9E3]">
            API v1 Contract Lock
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191c19]">
            <thead>
              <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                <th className="py-3 px-5">Mã voucher</th>
                <th className="py-3 px-5">Mức giảm giá</th>
                <th className="py-3 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {vouchers.map((vch) => (
                <tr key={vch.id} className="hover:bg-[#FAF4DF]/40 transition-colors">
                  <td className="py-3.5 px-5">
                    <span className="inline-flex items-center px-3 py-1.5 bg-[#f3f4ef] font-mono font-bold text-[#000a04] tracking-wider text-[13px] rounded">
                      {vch.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="font-bold text-[#0B2419] text-sm">{vch.discount}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(vch)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-[#0B2419] hover:bg-[#edeee9] transition-colors text-xs font-bold uppercase tracking-wider rounded"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Sửa</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 bg-[#FAF9F5] flex items-center justify-between text-xs text-[#687069] border-t border-[#E8E9E3]">
          <div className="flex items-center gap-1.5">
            <span>Hiển thị</span>
            <strong className="text-[#0B2419]">{vouchers.length}</strong>
            <span>voucher trên toàn hệ thống</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider">
            <span className="text-[#0B2419]">Trang 1 / 1</span>
          </div>
        </div>
      </div>

      {/* ================= MODAL: TẠO VOUCHER ================= */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-xs"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-lg shadow-2xl relative flex flex-col overflow-hidden border border-[#E8E9E3]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#f3f4ef] border-b border-[#E8E9E3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px]">add_circle</span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#687069]">Biểu mẫu POST</div>
                  <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419]">
                    Tạo voucher mới
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-[#687069] hover:text-[#0B2419] rounded"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-[#687069]">
                Thêm một mã khuyến mại mới và thiết lập mức giảm giá vào hệ thống quản lý tập trung.
              </p>
              <div>
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                  Mã voucher <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: SUMMER2026"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-[#f3f4ef] font-mono font-bold text-sm text-[#0B2419] uppercase border border-[#E8E9E3] rounded focus:outline-none focus:bg-white focus:border-[#0B2419]"
                />
                <p className="text-[10px] text-[#687069] mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">code</span>
                  Dữ liệu mã voucher gửi qua POST /api/v1/admin/vouchers
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                  Mức tiền giảm giá <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 100.000 ₫"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f4ef] font-bold text-sm text-[#0B2419] border border-[#E8E9E3] rounded focus:outline-none focus:bg-white focus:border-[#0B2419]"
                />
                <p className="text-[10px] text-[#687069] mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  Giá trị tiền giảm hoặc tỉ lệ % giảm giá cho hóa đơn
                </p>
              </div>

              <div className="pt-3 border-t border-[#E8E9E3] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-[#687069] hover:bg-[#f3f4ef] rounded font-bold uppercase tracking-wider"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0B2419] text-white hover:bg-[#1B5038] transition-colors rounded font-bold uppercase tracking-wider shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Tạo voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SỬA VOUCHER ================= */}
      {editModalOpen && editingVoucher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-xs"
          onClick={() => setEditModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-lg shadow-2xl relative flex flex-col overflow-hidden border border-[#E8E9E3]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#f3f4ef] border-b border-[#E8E9E3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#725c00] text-[22px]">edit_note</span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#687069]">Biểu mẫu PATCH</div>
                  <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419]">
                    Sửa voucher — {editingVoucher.code}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-[#687069] hover:text-[#0B2419] rounded"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-[#687069]">
                Thay đổi giá trị chuỗi định danh và mức tiền giảm giá của mã voucher.
              </p>
              <div>
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                  Mã voucher <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-[#f3f4ef] font-mono font-bold text-sm text-[#0B2419] uppercase border border-[#E8E9E3] rounded focus:outline-none focus:bg-white focus:border-[#0B2419]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0B2419] uppercase tracking-wider mb-1">
                  Mức tiền giảm giá <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f4ef] font-bold text-sm text-[#0B2419] border border-[#E8E9E3] rounded focus:outline-none focus:bg-white focus:border-[#0B2419]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8E9E3] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-[#687069] hover:bg-[#f3f4ef] rounded font-bold uppercase tracking-wider"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E5C358] text-[#111814] hover:bg-[#d6b54a] transition-colors rounded font-bold uppercase tracking-wider shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
