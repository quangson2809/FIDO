import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const OrderDetailScreen: React.FC = () => {
  const { selectedOrderId, orders, updateOrderRecipient, setCurrentScreen, showToast } = useApp();

  const order = orders.find((o) => o.id === selectedOrderId) || orders[1] || orders[0];

  const [phone, setPhone] = useState(order.customerPhone);
  const [address, setAddress] = useState(order.recipientAddress);
  const [deliveryNote, setDeliveryNote] = useState(order.deliveryNote || 'Giao giờ hành chính, gọi trước 15 phút, lên gấu quần selvedge giữ viền nguyên bản.');
  const [deliveryTime, setDeliveryTime] = useState('business');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(order.id);
      showToast('Đã sao chép mã đơn: ' + order.id);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setTimeout(() => {
      updateOrderRecipient(order.id, phone, address, deliveryNote);
      setIsUpdating(false);
      showToast('Cập nhật địa chỉ nhận hàng thành công (PATCH /api/v1/me/orders/recipient)');
    }, 600);
  };

  const handleCancel = () => {
    if (window.confirm(`Quý khách có chắc chắn muốn hủy đơn hàng ${order.id}? Hành động này sẽ được ghi nhận và gửi đến bộ phận CSKH.`)) {
      showToast('Yêu cầu hủy đơn hàng đã được gửi tới Atelier Concierge.');
    }
  };

  const handleReset = () => {
    setPhone('0912 345 678');
    setAddress('Số 128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
    setDeliveryNote('Giao giờ hành chính, gọi trước 15 phút, lên gấu quần selvedge giữ viền nguyên bản.');
    showToast('Đã khôi phục thông tin người nhận ban đầu');
  };

  return (
    <div className="w-full bg-[#FFFDF5] min-h-screen">
      {/* Breadcrumbs */}
      <div className="w-full h-[44px] bg-[#F5F6F2] border-b border-[#E2E5DE] px-4 sm:px-8 flex items-center text-[13px] text-[#606863] font-medium">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419] transition-colors">
            Trang chủ
          </button>
          <span>/</span>
          <button onClick={() => setCurrentScreen('profile')} className="hover:text-[#0B2419] transition-colors">
            Tài khoản
          </button>
          <span>/</span>
          <button onClick={() => setCurrentScreen('my-orders')} className="hover:text-[#0B2419] transition-colors">
            Đơn hàng của tôi
          </button>
          <span>/</span>
          <span className="text-[#0B2419] font-semibold">Chi tiết đơn hàng</span>
        </nav>
      </div>

      <div className="w-full px-4 sm:px-8 lg:px-14 py-8 max-w-7xl mx-auto space-y-6">
        {/* KHỐI A: HEADER THÔNG TIN ĐƠN HÀNG & TIẾN TRÌNH (TIMELINE) */}
        <section className="bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-[#E8E9E3]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E8E9E3]">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
                  Hồ sơ giao dịch bảo chứng
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C75B]"></span>
                <span className="text-[11px] uppercase tracking-wider text-[#123A29] font-bold">
                  Atelier Prêt-à-Porter No. 924
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl text-[#0B2419] tracking-tight font-bold">
                  Đơn Hàng #{order.id}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 text-[#424844] hover:text-[#0B2419] text-xs uppercase tracking-wider bg-[#f3f4ef] px-2.5 py-1 rounded font-bold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Sao chép mã</span>
                </button>
                <div className="inline-flex items-center gap-1.5 bg-[#FAF4DF] px-3 py-1 rounded border border-[#E8C75B]/40">
                  <span className="w-2 h-2 rounded-full bg-[#c7a840] animate-pulse"></span>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#4d3e00]">
                    {order.statusLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Stamps */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#f3f4ef] p-4 rounded-lg border border-[#E8E9E3]">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                  Ngày tạo đơn
                </span>
                <span className="text-xs text-[#0B2419] font-bold font-mono">24/09/2026</span>
                <span className="block text-[10px] text-[#687069] font-mono">14:35:18</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                  Cập nhật cuối
                </span>
                <span className="text-xs text-[#0B2419] font-bold font-mono">24/09/2026</span>
                <span className="block text-[10px] text-[#687069] font-mono">14:40:02</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                  Hoàn tất đơn
                </span>
                <span className="text-xs text-[#687069] font-mono">—</span>
                <span className="block text-[10px] text-[#687069]">Chưa hoàn tất</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                  Trả hàng / Hoàn
                </span>
                <span className="text-xs text-[#687069] font-mono">—</span>
                <span className="block text-[10px] text-[#687069]">Hợp lệ đổi trả</span>
              </div>
            </div>
          </div>

          {/* Timeline Tracking Progress */}
          <div className="pt-6">
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 bg-[#edeee9] -translate-y-1/2 z-0"></div>
              <div className="hidden md:block absolute top-1/2 left-8 w-1/4 h-0.5 bg-[#0B2419] -translate-y-1/2 z-0"></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
                {/* Step 1 */}
                <div className="flex md:flex-col items-center md:items-center text-left md:text-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#0B2419] text-white flex items-center justify-center text-xs font-bold shadow">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#0B2419]">Đặt hàng thành công</p>
                    <p className="text-[11px] text-[#687069]">24/09 • 14:35</p>
                  </div>
                </div>
                {/* Step 2 (Active) */}
                <div className="flex md:flex-col items-center md:items-center text-left md:text-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#E8C75B] text-[#101310] flex items-center justify-center text-xs font-bold shadow ring-4 ring-[#FAF4DF]">
                    2
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[#0B2419]">Chờ xác nhận</p>
                    <p className="text-[11px] text-[#725c00] font-semibold">Đang điều phối Fitting</p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex md:flex-col items-center md:items-center text-left md:text-center gap-2 opacity-60">
                  <div className="w-9 h-9 rounded-full bg-[#edeee9] text-[#424844] flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#191c19]">Chuẩn bị hàng</p>
                    <p className="text-[11px] text-[#687069]">Đóng gói chuẩn Atelier</p>
                  </div>
                </div>
                {/* Step 4 */}
                <div className="flex md:flex-col items-center md:items-center text-left md:text-center gap-2 opacity-60">
                  <div className="w-9 h-9 rounded-full bg-[#edeee9] text-[#424844] flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#191c19]">Đang giao hàng</p>
                    <p className="text-[11px] text-[#687069]">Atelier Express bưu tá</p>
                  </div>
                </div>
                {/* Step 5 */}
                <div className="flex md:flex-col items-center md:items-center text-left md:text-center gap-2 opacity-60">
                  <div className="w-9 h-9 rounded-full bg-[#edeee9] text-[#424844] flex items-center justify-center text-xs font-bold">
                    5
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#191c19]">Hoàn tất giao dịch</p>
                    <p className="text-[11px] text-[#687069]">Đồng kiểm &amp; Thử size</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 p-3 bg-[#FFFDF5] rounded-md border border-[#E8C75B]/30 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#123A29] text-[20px]">info</span>
              <p className="text-xs text-[#123A29]">
                Đơn hàng đang ở trạng thái <strong className="font-bold">Chờ xác nhận</strong>. Quý khách hoàn toàn có quyền cập nhật lại số điện thoại và địa chỉ nhận hàng bên dưới mà không ảnh hưởng đến tiến độ may đo &amp; đóng gói.
              </p>
            </div>
          </div>
        </section>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI (8/12 Desktop): SẢN PHẨM & THÔNG TIN NGƯỜI NHẬN & FORM CẬP NHẬT */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* KHỐI C: DANH SÁCH SẢN PHẨM TRONG ĐƠN */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3] mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                    Chi tiết may đo
                  </span>
                  <h2 className="font-serif text-2xl text-[#0B2419]">Sản Phẩm Trong Đơn Hàng (02)</h2>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#f8faf4] p-3 rounded border border-[#E8E9E3]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-20 h-24 bg-[#edeee9] shrink-0 overflow-hidden rounded border border-[#E8E9E3]">
                        <img className="w-full h-full object-cover object-center" src={item.imageUrl} alt={item.name} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                          {item.subCategory}
                        </span>
                        <h3 className="text-sm font-bold text-[#071A12] truncate">{item.name}</h3>
                        <p className="text-xs text-[#687069] mt-0.5">
                          Mã SKU: <span className="text-[#101310] font-mono font-medium">{item.sku}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                          <span>
                            Size: <strong className="font-bold text-[#0B2419]">{item.size}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Màu sắc: <strong className="text-[#0B2419]">{item.color}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Số lượng: <strong className="text-[#0B2419]">{item.quantity}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-base text-[#0B2419] font-bold font-mono">
                        {((item.price || 0).toLocaleString('vi-VN'))} ₫
                      </div>
                      <div className="text-[11px] text-[#687069] mt-0.5">
                        Thành tiền: {((item.price * item.quantity || 0).toLocaleString('vi-VN'))} ₫
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Luxury Packaging Note */}
              <div className="mt-4 p-4 bg-[#FAF4DF] rounded border border-[#E8C75B]/30 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#725c00] text-[24px] shrink-0 mt-0.5">
                  inventory_2
                </span>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#725c00] font-bold block">
                    Quy chuẩn đóng gói Signature Atelier Vert
                  </span>
                  <p className="text-xs text-[#191c19] mt-0.5 leading-relaxed">
                    Hộp cứng cao cấp 2 lớp bọc giấy nến thơm Atelier Vert, tặng kèm túi chống ẩm &amp; thư cảm ơn viết tay tri ân Quý khách {order.customerName}.
                  </p>
                </div>
              </div>
            </section>

            {/* KHỐI B: THÔNG TIN NGƯỜI NHẬN HIỆN TẠI */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E8E9E3] mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                    Thông tin nhận hàng hiện tại
                  </span>
                  <h2 className="font-serif text-2xl text-[#0B2419]">Người Nhận &amp; Địa Điểm Bàn Giao</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('recipientUpdateSection');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 text-[#0B2419] hover:text-[#1B5038] bg-[#f3f4ef] hover:bg-[#edeee9] px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Chỉnh sửa thông tin này</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f8faf4] p-4 rounded-lg border border-[#E8E9E3]">
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                      Họ và tên khách hàng
                    </span>
                    <p className="text-sm text-[#071A12] font-bold mt-0.5">{order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                      Số điện thoại liên lạc
                    </span>
                    <p className="text-sm text-[#0B2419] font-mono font-bold mt-0.5">{order.customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                      Hòm thư xác nhận
                    </span>
                    <p className="text-xs text-[#687069] mt-0.5">{order.customerEmail}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                      Địa chỉ giao nhận chi tiết
                    </span>
                    <p className="text-xs text-[#071A12] mt-0.5 font-medium leading-relaxed">
                      {order.recipientAddress}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#687069] font-bold">
                      Ghi chú vận chuyển đặc biệt
                    </span>
                    <p className="text-xs text-[#123A29] bg-[#FAF4DF]/70 p-2.5 rounded border border-[#E8C75B]/30 mt-0.5 italic">
                      “{order.deliveryNote || 'Giao giờ hành chính, gọi trước 15 phút, lên gấu quần selvedge giữ viền nguyên bản.'}”
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* KHỐI G: FORM CẬP NHẬT THÔNG TIN NGƯỜI NHẬN */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3]" id="recipientUpdateSection">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-[#0B2419] text-[20px]">local_shipping</span>
                    <span className="text-[10px] uppercase tracking-widest text-[#0B2419] font-bold">
                      Quyền Quản Lý Giao Hàng
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl text-[#0B2419]">Chỉnh Sửa Thông Tin Nhận Hàng</h2>
                </div>
                <span className="inline-flex items-center gap-1 bg-[#FAF4DF] text-[#101310] text-[10px] uppercase tracking-widest px-3 py-1 rounded font-bold border border-[#E8C75B]/40">
                  <span className="w-2 h-2 rounded-full bg-[#0B2419]"></span>
                  Đang mở chỉnh sửa (Đơn chưa xuất kho)
                </span>
              </div>
              <p className="text-xs text-[#687069] mb-4 leading-relaxed">
                Theo chính sách May Đo &amp; Giao Vận Atelier Vert, Quý khách được phép thay đổi số điện thoại và địa chỉ giao hàng hoàn toàn miễn phí trước khi đơn hàng chuyển tiếp sang trạng thái <em className="text-[#0B2419] font-bold not-italic">Đang chuẩn bị xuất kho</em>.
              </p>

              <form className="space-y-4" onSubmit={handleUpdate}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#687069] font-bold mb-1" htmlFor="inputRecipientPhone">
                      Số điện thoại người nhận <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="flex items-center bg-[#f3f4ef] px-3 py-2 rounded border border-[#E8E9E3] focus-within:border-[#0B2419]">
                      <span className="material-symbols-outlined text-[#687069] text-[18px] mr-2">phone_iphone</span>
                      <input
                        className="bg-transparent text-xs text-[#071A12] outline-none w-full font-bold font-mono"
                        id="inputRecipientPhone"
                        name="phone"
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#687069] font-bold mb-1" htmlFor="inputDeliveryTime">
                      Khung giờ nhận đề xuất
                    </label>
                    <div className="flex items-center bg-[#f3f4ef] px-3 py-2 rounded border border-[#E8E9E3]">
                      <span className="material-symbols-outlined text-[#687069] text-[18px] mr-2">schedule</span>
                      <select
                        className="bg-transparent text-xs text-[#071A12] outline-none w-full cursor-pointer"
                        id="inputDeliveryTime"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                      >
                        <option value="business">Giờ hành chính (08:30 - 18:00)</option>
                        <option value="evening">Buổi tối (18:00 - 21:00)</option>
                        <option value="weekend">Cuối tuần (Thứ 7 - CN)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#687069] font-bold mb-1" htmlFor="inputRecipientAddress">
                    Địa chỉ giao nhận chi tiết <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex items-start bg-[#f3f4ef] p-3 rounded border border-[#E8E9E3] focus-within:border-[#0B2419]">
                    <span className="material-symbols-outlined text-[#687069] text-[18px] mr-2 mt-0.5">pin_drop</span>
                    <textarea
                      className="bg-transparent text-xs text-[#071A12] outline-none w-full font-medium resize-none leading-relaxed"
                      id="inputRecipientAddress"
                      name="address"
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#687069] font-bold mb-1" htmlFor="inputDeliveryNote">
                    Chỉ dẫn cho bưu tá Atelier Express
                  </label>
                  <div className="flex items-center bg-[#f3f4ef] px-3 py-2 rounded border border-[#E8E9E3]">
                    <span className="material-symbols-outlined text-[#687069] text-[18px] mr-2">notes</span>
                    <input
                      className="bg-transparent text-xs text-[#071A12] outline-none w-full"
                      id="inputDeliveryNote"
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <span className="text-[11px] text-[#687069] flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[15px] text-[#123A29]">verified_user</span>
                    Cập nhật gửi trực tiếp qua endpoint PATCH /api/v1/me/orders/recipient
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-[#191c19] hover:bg-[#edeee9] text-xs uppercase tracking-wider font-bold rounded transition-colors"
                    >
                      Khôi phục gốc
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-[#0B2419] hover:bg-[#1B5038] text-white px-5 py-2.5 text-xs uppercase tracking-widest font-bold rounded transition-colors flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      {isUpdating ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Lưu Thay Đổi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>

          {/* CỘT PHẢI (4/12 Desktop): THANH TOÁN, GIAO VẬN, TỔNG TIỀN & HÀNH ĐỘNG */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* KHỐI D: THANH TOÁN */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3] mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                    Hồ sơ giao dịch
                  </span>
                  <h3 className="font-serif text-lg text-[#0B2419] font-bold">Trạng Thái Thanh Toán</h3>
                </div>
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-[#ffdad6] text-[#ba1a1a] font-bold">
                  Chưa thanh toán (COD)
                </span>
              </div>
              <div className="bg-[#f3f4ef] p-4 rounded text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#687069]">Hình thức:</span>
                  <span className="font-bold text-[#071A12]">Thanh toán khi nhận hàng (COD)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#687069]">Đặc quyền:</span>
                  <span className="text-[#123A29] font-bold">Đồng kiểm &amp; Thử size</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#E8E9E3]">
                  <span className="text-[#687069]">Số tiền phải trả:</span>
                  <span className="text-[#0B2419] font-bold font-mono text-sm">880.000 ₫</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#687069]">Số tiền đã nhận:</span>
                  <span className="text-[#687069]">0 ₫ (Thu trực tiếp bởi shipper)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#687069]">Số tiền đã hoàn:</span>
                  <span className="text-[#687069]">0 ₫</span>
                </div>
              </div>
            </section>

            {/* KHỐI E: GIAO HÀNG */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3] mb-3">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                    Vận chuyển cao cấp
                  </span>
                  <h3 className="font-serif text-lg text-[#0B2419] font-bold">Giao Vận &amp; Hành Trình</h3>
                </div>
                <span className="material-symbols-outlined text-[#123A29] text-[22px]">local_shipping</span>
              </div>
              <div className="p-3 bg-[#FFFDF5] rounded border border-[#E8C75B]/30">
                <span className="text-[10px] uppercase tracking-wider text-[#725c00] font-bold block">
                  Dự kiến giao hàng
                </span>
                <p className="text-sm text-[#071A12] font-bold font-mono mt-0.5">25/09/2026 – 26/09/2026</p>
                <p className="text-[11px] text-[#687069] mt-0.5">
                  Giao nhanh trong 24h - 48h tại khu vực TP. Hồ Chí Minh
                </p>
              </div>
            </section>

            {/* KHỐI F: BẢNG TỔNG HỢP CHI PHÍ */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3]">
              <div className="pb-3 border-b border-[#E8E9E3] mb-3">
                <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">Hóa đơn giá trị</span>
                <h3 className="font-serif text-lg text-[#0B2419] font-bold">Bảng Tổng Hợp Chi Phí</h3>
              </div>
              <div className="flex flex-col gap-2 pb-3 text-xs text-[#191c19]">
                <div className="flex items-center justify-between">
                  <span className="text-[#687069]">Tạm tính (02 sản phẩm):</span>
                  <span className="font-bold text-[#071A12] font-mono">900.000 ₫</span>
                </div>
                <div className="flex items-center justify-between text-[#123A29]">
                  <div className="flex items-center gap-1">
                    <span>Voucher Atelier:</span>
                    <span className="text-[10px] uppercase bg-[#FAF4DF] text-[#101310] px-1.5 py-0.5 rounded font-bold border border-[#E8C75B]/40">
                      ABC123
                    </span>
                  </div>
                  <span className="font-bold font-mono">- 50.000 ₫</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#687069]">Phí giao hàng bảo chứng:</span>
                  <span className="font-bold text-[#071A12] font-mono">30.000 ₫</span>
                </div>
                <div className="flex items-center justify-between text-[#687069]">
                  <span>Thuế giá trị gia tăng VAT (8%):</span>
                  <span>Đã bao gồm trong giá</span>
                </div>
              </div>
              {/* Final Sum */}
              <div className="pt-3 border-t border-[#E8E9E3] bg-[#FAF4DF]/40 -mx-6 px-6 py-3 rounded-b-lg">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm text-[#071A12] font-bold uppercase tracking-wider">Tổng cộng:</span>
                  <span className="font-mono text-xl text-[#0B2419] font-bold">880.000 ₫</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#123A29]">
                  <span>Cần thanh toán khi nhận (COD):</span>
                  <span className="font-bold font-mono">880.000 ₫</span>
                </div>
              </div>
            </section>

            {/* KHỐI HÀNH ĐỘNG HỖ TRỢ KHÁCH HÀNG & CONCIERGE */}
            <section className="bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full bg-[#edeee9] hover:bg-[#e7e9e3] text-[#0B2419] text-xs uppercase tracking-wider py-2.5 px-4 rounded font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>In Biên Nhận Đơn Hàng</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="w-full bg-transparent hover:bg-[#ffdad6]/40 text-[#ba1a1a] text-xs uppercase tracking-wider py-2.5 px-4 rounded font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Hủy Đơn Hàng Này</span>
              </button>
              {/* Concierge Support Card */}
              <div className="mt-2 p-3 bg-[#f8faf4] rounded border border-[#E8E9E3] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0B2419] text-[#E8C75B] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <div className="min-w-0 text-xs">
                  <span className="text-[10px] uppercase tracking-widest text-[#687069] font-bold">
                    Atelier Private Concierge
                  </span>
                  <p className="text-sm text-[#0B2419] font-bold">Hotline 1900 8899</p>
                  <p className="text-[11px] text-[#687069]">Hỗ trợ may đo, đổi size và giao hỏa tốc 24/7</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
