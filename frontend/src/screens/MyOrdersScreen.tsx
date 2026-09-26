import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { OrderStatus } from '../types';

export const MyOrdersScreen: React.FC = () => {
  const { orders, setCurrentScreen, setSelectedOrderId, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isPending = (status: OrderStatus) =>
    status === 'processing' || status === 'PENDING' || status === 'PREPARING';
  const isShipping = (status: OrderStatus) =>
    status === 'shipping' || status === 'SHIPPING';
  const isCompleted = (status: OrderStatus) =>
    status === 'delivered' || status === 'COMPLETED';
  const isCancelled = (status: OrderStatus) =>
    status === 'cancelled' || status === 'CANCELLED';

  const filteredOrders = orders.filter((order) => {
    let matchesTab = true;
    if (activeTab === 'processing') {
      matchesTab = isPending(order.status);
    } else if (activeTab === 'shipping') {
      matchesTab = isShipping(order.status);
    } else if (activeTab === 'delivered') {
      matchesTab = isCompleted(order.status);
    } else if (activeTab === 'cancelled') {
      matchesTab = isCancelled(order.status);
    }

    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) =>
        (item.name || item.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    if (isPending(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Chờ xác nhận & cắt may
        </span>
      );
    }
    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Đã duyệt đơn
        </span>
      );
    }
    if (isShipping(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 border border-sky-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
          Đang vận chuyển
        </span>
      );
    }
    if (isCompleted(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Giao thành công
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        Đã hủy đơn
      </span>
    );
  };

  return (
    <div className="bg-[#FAF9F5] min-h-screen text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] py-8 lg:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#0B2419]/60 uppercase tracking-widest mb-6">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">
            Trang chủ
          </button>
          <span>/</span>
          <button onClick={() => setCurrentScreen('profile')} className="hover:text-[#0B2419]">
            Tài khoản
          </button>
          <span>/</span>
          <span className="text-[#0B2419] font-semibold">Đơn hàng của tôi</span>
        </div>

        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#0B2419]/10 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-bold text-[#0B2419]">
              Quản Lý Lịch Sử Đơn Hàng
            </h1>
            <p className="text-sm text-[#0B2419]/70 mt-1">
              Theo dõi lộ trình giao nhận thời gian thực và quản lý yêu cầu chỉnh sửa số đo may đo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('catalog')}
              className="px-4 py-2.5 bg-[#0B2419] text-white text-xs font-semibold uppercase tracking-wider rounded-none hover:bg-[#123A29] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">shopping_bag</span>
              Tiếp tục mua sắm
            </button>
          </div>
        </div>

        {/* Tab Filters & Search Bar */}
        <div className="bg-white border border-[#0B2419]/10 p-4 mb-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 font-medium whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-[#FAF9F5] text-[#0B2419]/70 hover:text-[#0B2419] hover:bg-[#0B2419]/5'
              }`}
            >
              Tất cả ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={`px-3.5 py-2 font-medium whitespace-nowrap transition-all ${
                activeTab === 'processing'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-[#FAF9F5] text-[#0B2419]/70 hover:text-[#0B2419] hover:bg-[#0B2419]/5'
              }`}
            >
              Chờ xác nhận ({orders.filter((o) => isPending(o.status)).length})
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-3.5 py-2 font-medium whitespace-nowrap transition-all ${
                activeTab === 'shipping'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-[#FAF9F5] text-[#0B2419]/70 hover:text-[#0B2419] hover:bg-[#0B2419]/5'
              }`}
            >
              Đang giao ({orders.filter((o) => isShipping(o.status)).length})
            </button>
            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3.5 py-2 font-medium whitespace-nowrap transition-all ${
                activeTab === 'delivered'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-[#FAF9F5] text-[#0B2419]/70 hover:text-[#0B2419] hover:bg-[#0B2419]/5'
              }`}
            >
              Hoàn thành ({orders.filter((o) => isCompleted(o.status)).length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3.5 py-2 font-medium whitespace-nowrap transition-all ${
                activeTab === 'cancelled'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-[#FAF9F5] text-[#0B2419]/70 hover:text-[#0B2419] hover:bg-[#0B2419]/5'
              }`}
            >
              Đã hủy ({orders.filter((o) => isCancelled(o.status)).length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              placeholder="Tìm theo mã đơn hoặc sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-4 py-2 border border-[#0B2419]/15 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-base text-[#0B2419]/40">
              search
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#0B2419]/40 hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-[#0B2419]/10 p-12 text-center my-8">
            <span className="material-symbols-outlined text-4xl text-[#0B2419]/30 mb-3">inventory_2</span>
            <h3 className="text-base font-semibold text-[#0B2419]">Không tìm thấy đơn hàng nào</h3>
            <p className="text-xs text-[#0B2419]/60 max-w-sm mx-auto mt-1 mb-6">
              Bạn chưa có đơn hàng nào thuộc bộ lọc này hoặc mã tìm kiếm không trùng khớp.
            </p>
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
              }}
              className="px-5 py-2 bg-[#0B2419] text-white text-xs font-semibold uppercase tracking-wider"
            >
              Xem tất cả đơn hàng
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const recipientName = order.recipient?.fullName || order.customerName;
              const recipientPhone = order.recipient?.phone || order.customerPhone;
              const recipientAddress = order.recipient?.address || order.recipientAddress;
              const totalVal = order.totalAmount ?? order.total;

              return (
                <div
                  key={order.id}
                  className="bg-white border border-[#0B2419]/10 overflow-hidden shadow-xs hover:border-[#0B2419]/30 transition-all"
                >
                  {/* Order Card Header */}
                  <div className="bg-[#FAF9F5] border-b border-[#0B2419]/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-bold font-mono text-[#0B2419]">{order.id}</span>
                      <span className="text-xs text-[#0B2419]/40">•</span>
                      <span className="text-xs text-[#0B2419]/60">{order.createdAt}</span>
                      <span className="text-xs text-[#0B2419]/40">•</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#0B2419]/70">
                        Hình thức: <span className="font-semibold text-[#0B2419]">COD (Tiền mặt)</span>
                      </span>
                      <button
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setCurrentScreen('order-detail');
                        }}
                        className="px-3 py-1.5 bg-[#0B2419]/5 hover:bg-[#0B2419] hover:text-white text-[#0B2419] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1"
                      >
                        Chi tiết đơn
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  {/* Items in this order */}
                  <div className="divide-y divide-[#0B2419]/5">
                    {order.items.map((item, idx) => {
                      const itemName = item.name || item.product?.name;
                      const itemImg = item.imageUrl || item.product?.imageUrl || '';
                      const itemCategory = item.subCategory || item.product?.category || 'Sản phẩm Atelier';
                      const colorVal = item.selectedColor || item.color;
                      const sizeVal = item.selectedSize || item.size;
                      const tailoringNote = item.customTailoringNote;

                      return (
                        <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={itemImg}
                              alt={itemName}
                              className="w-16 h-20 sm:w-20 sm:h-24 object-cover object-top border border-[#0B2419]/10 shrink-0"
                            />
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#123A29]">
                                {itemCategory}
                              </span>
                              <h4 className="text-sm font-bold text-[#0B2419]">{itemName}</h4>
                              <p className="text-xs text-[#0B2419]/60 mt-0.5">
                                Phân loại: <span className="font-medium text-[#0B2419]">{colorVal}</span> | Size:{' '}
                                <span className="font-medium text-[#0B2419]">{sizeVal}</span> | SL:{' '}
                                <span className="font-medium text-[#0B2419]">{item.quantity}</span>
                              </p>
                              {tailoringNote && (
                                <p className="text-xs text-amber-700 bg-amber-500/10 px-2 py-0.5 mt-1 inline-block border border-amber-500/20">
                                  Yêu cầu lên gấu: {tailoringNote}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="sm:text-right w-full sm:w-auto">
                            <span className="text-sm font-bold text-[#0B2419]">
                              {((item.price * item.quantity || 0).toLocaleString('vi-VN'))}₫
                            </span>
                            <div className="text-[11px] text-[#0B2419]/60">
                              {((item.price || 0).toLocaleString('vi-VN'))}₫ / cái
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer summary */}
                  <div className="p-4 sm:p-5 bg-[#FFFDF5] border-t border-[#0B2419]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-[#0B2419]/70 space-y-1">
                      <p>
                        <span className="font-medium text-[#0B2419]">Người nhận:</span> {recipientName} -{' '}
                        {recipientPhone}
                      </p>
                      <p className="line-clamp-1">
                        <span className="font-medium text-[#0B2419]">Địa chỉ:</span> {recipientAddress}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#0B2419]/10">
                      <div className="text-right">
                        <span className="text-xs text-[#0B2419]/60 block">Tổng tiền thanh toán COD:</span>
                        <span className="text-base sm:text-lg font-bold text-[#0B2419]">
                          {((totalVal || 0).toLocaleString('vi-VN'))}₫
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPending(order.status) && (
                          <button
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setCurrentScreen('order-detail');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold border border-amber-600/40 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                          >
                            Sửa địa chỉ
                          </button>
                        )}
                        <button
                          onClick={() => {
                            showToast(`Đã sao chép mã đơn ${order.id}`);
                          }}
                          className="p-1.5 text-[#0B2419]/60 hover:text-[#0B2419] border border-[#0B2419]/15"
                          title="Sao chép mã"
                        >
                          <span className="material-symbols-outlined text-base">content_copy</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
