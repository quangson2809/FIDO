import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { AdminDashboardView } from './admin/AdminDashboardView';
import { AdminProductsView } from './admin/AdminProductsView';
import { AdminProductDetailView } from './admin/AdminProductDetailView';
import { AdminCatalogMetaView } from './admin/AdminCatalogMetaView';
import { AdminOrderDetailView } from './admin/AdminOrderDetailView';
import { AdminCustomerDetailView } from './admin/AdminCustomerDetailView';
import { AdminVouchersView } from './admin/AdminVouchersView';
import { AdminSuppliersView } from './admin/AdminSuppliersView';
import { AdminInwardView } from './admin/AdminInwardView';
import { AdminInventoryView } from './admin/AdminInventoryView';
import { AdminAuditView } from './admin/AdminAuditView';
import { AdminCustomersView } from './admin/AdminCustomersView';
import { AdminStaffView } from './admin/AdminStaffView';
import { AdminRolesView } from './admin/AdminRolesView';
import { AdminReportsView } from './admin/AdminReportsView';
import { AdminSettingsView } from './admin/AdminSettingsView';
import { getAdminPath, resolveAdminRoute } from '../routes/paths';

export const AdminScreen: React.FC = () => {
  const { orders, updateOrderStatus, updateOrderRecipient, setCurrentScreen, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { menuKey: activeMenu, breadcrumb: activeBreadcrumb } = resolveAdminRoute(location.pathname);

  // Mobile sidebar toggle
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filters & search for orders
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tailoringOnly, setTailoringOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Slideover Detail Drawer & Edit states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditingRecipient, setIsEditingRecipient] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNote, setEditNote] = useState('');

  // Print slip modal state
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // Helper status checkers
  const isPending = (status: OrderStatus) =>
    status === 'processing' || status === 'PENDING' || status === 'PREPARING';
  const isShipping = (status: OrderStatus) =>
    status === 'shipping' || status === 'SHIPPING';
  const isCompleted = (status: OrderStatus) =>
    status === 'delivered' || status === 'COMPLETED';
  const isCancelled = (status: OrderStatus) =>
    status === 'cancelled' || status === 'CANCELLED';

  // Has tailoring note
  const orderHasTailoring = (order: Order) =>
    order.items.some((i) => Boolean(i.customTailoringNote)) ||
    Boolean(order.deliveryNote?.toLowerCase().includes('lên gấu') || order.deliveryNote?.toLowerCase().includes('gấu'));

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    let matchesStatus = true;
    if (filterStatus === 'pending') {
      matchesStatus = isPending(o.status);
    } else if (filterStatus === 'shipping') {
      matchesStatus = isShipping(o.status);
    } else if (filterStatus === 'delivered') {
      matchesStatus = isCompleted(o.status);
    } else if (filterStatus === 'cancelled') {
      matchesStatus = isCancelled(o.status);
    } else if (filterStatus === 'tailoring') {
      matchesStatus = orderHasTailoring(o);
    }

    if (tailoringOnly && !orderHasTailoring(o)) {
      return false;
    }

    const customerName = o.recipient?.fullName || o.customerName || '';
    const phone = o.recipient?.phone || o.customerPhone || '';
    const tracking = o.trackingNumber || '';
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      tracking.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // KPI calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount ?? o.total), 0);
  const pendingOrders = orders.filter((o) => isPending(o.status)).length;
  const shippingOrders = orders.filter((o) => isShipping(o.status)).length;
  const completedOrders = orders.filter((o) => isCompleted(o.status)).length;
  const tailoringCount = orders.filter((o) => orderHasTailoring(o)).length;

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectRow = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
    } else {
      setSelectedOrderIds([...selectedOrderIds, orderId]);
    }
  };

  // Status update
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  // Open detail drawer
  const openDetailDrawer = (order: Order) => {
    setSelectedOrder(order);
    setIsEditingRecipient(false);
    setEditName(order.recipient?.fullName || order.customerName || '');
    setEditPhone(order.recipient?.phone || order.customerPhone || '');
    setEditAddress(order.recipient?.address || order.recipientAddress || '');
    setEditNote(order.recipient?.note || order.deliveryNote || '');
  };

  // Save recipient edit
  const handleSaveRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    updateOrderRecipient(selectedOrder.id, editPhone, editAddress, editNote);
    setSelectedOrder({
      ...selectedOrder,
      customerPhone: editPhone,
      recipientAddress: editAddress,
      deliveryNote: editNote,
      recipient: {
        ...selectedOrder.recipient,
        fullName: editName,
        phone: editPhone,
        address: editAddress,
        note: editNote
      }
    });
    setIsEditingRecipient(false);
    showToast(`Đã cập nhật thông tin người nhận đơn ${selectedOrder.id}`);
  };

  // Batch actions
  const handleBatchApprove = () => {
    selectedOrderIds.forEach((id) => updateOrderStatus(id, 'PREPARING'));
    showToast(`Đã duyệt hàng loạt ${selectedOrderIds.length} đơn hàng! Đã gửi thông báo vào xưởng.`);
    setSelectedOrderIds([]);
  };

  const handleBatchShip = () => {
    selectedOrderIds.forEach((id) => updateOrderStatus(id, 'SHIPPING'));
    showToast(`Đã chuyển ${selectedOrderIds.length} đơn cho bưu tá giao hàng COD!`);
    setSelectedOrderIds([]);
  };

  const handleNavClick = (menuKey: string, _breadcrumb: string) => {
    navigate(getAdminPath(menuKey));
    setMobileSidebarOpen(false);
    if (menuKey === 'orders') {
      setFilterStatus('all');
      setTailoringOnly(false);
    } else if (menuKey === 'tailoring') {
      setFilterStatus('tailoring');
      setTailoringOnly(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf4] font-['Plus_Jakarta_Sans',sans-serif] text-[#191c19] antialiased">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* FIXED SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen w-[260px] bg-[#0B2419] z-50 flex flex-col justify-between select-none font-['Plus_Jakarta_Sans',sans-serif] transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo Header */}
          <div className="px-5 py-5 flex items-center justify-between border-b border-[#163829]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E5C358] flex items-center justify-center font-bold text-[#0B2419] text-base tracking-wider shadow-sm flex-shrink-0">
                F
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] font-bold text-[#E5C358] tracking-wider leading-tight">FIDO</span>
                <span className="text-[10px] text-white/60 uppercase tracking-widest leading-none mt-0.5 font-medium">
                  ADMIN CONSOLE
                </span>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1 text-white/60 hover:text-white lg:hidden"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-3 space-y-4 text-xs scrollbar-none">
            {/* Group 1: TỔNG QUAN */}
            <div>
              <div className="px-4 pb-1.5 text-[10px] uppercase font-bold text-[#E5C358]/80 tracking-wider">
                TỔNG QUAN
              </div>
              <div className="space-y-0.5 px-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('dashboard', 'Tổng quan')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'dashboard'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    <span>Dashboard</span>
                  </div>
                  {activeMenu === 'dashboard' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Group 2: SẢN PHẨM & CATALOG */}
            <div>
              <div className="px-4 pb-1.5 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                SẢN PHẨM &amp; CATALOG
              </div>
              <div className="space-y-0.5 px-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('products', 'Sản phẩm')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'products' || activeMenu === 'product-detail' || activeMenu === 'san-pham-detail'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">styler</span>
                    <span>Sản phẩm</span>
                  </div>
                  {(activeMenu === 'products' || activeMenu === 'product-detail' || activeMenu === 'san-pham-detail') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('categories', 'Danh mục')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'categories'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">category</span>
                    <span>Danh mục</span>
                  </div>
                  {activeMenu === 'categories' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('brands', 'Thương hiệu')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'brands'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Thương hiệu</span>
                  </div>
                  {activeMenu === 'brands' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('sizes', 'Hệ size')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'sizes'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">straighten</span>
                    <span>Hệ size</span>
                  </div>
                  {activeMenu === 'sizes' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('colors', 'Màu sắc')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'colors'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">palette</span>
                    <span>Màu sắc</span>
                  </div>
                  {activeMenu === 'colors' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Group 3: KHO & VẬN HÀNH */}
            <div>
              <div className="px-4 pb-1.5 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                KHO &amp; VẬN HÀNH
              </div>
              <div className="space-y-0.5 px-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('orders', 'Quản lý Đơn hàng')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'orders' || activeMenu === 'order-detail' || activeMenu === 'don-hang-detail' || activeMenu === 'tailoring'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                    <span>Đơn hàng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      activeMenu === 'orders' || activeMenu === 'order-detail' || activeMenu === 'don-hang-detail' || activeMenu === 'tailoring'
                        ? 'bg-[#111814]/15 text-[#111814]'
                        : 'bg-white/10 text-white/80'
                    }`}>
                      {orders.length}
                    </span>
                    {(activeMenu === 'orders' || activeMenu === 'order-detail' || activeMenu === 'don-hang-detail' || activeMenu === 'tailoring') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('inward', 'Phiếu nhập kho')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'inward'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">input</span>
                    <span>Phiếu nhập kho</span>
                  </div>
                  {activeMenu === 'inward' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('inventory', 'Tồn kho')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'inventory'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    <span>Tồn kho</span>
                  </div>
                  {activeMenu === 'inventory' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('history', 'Lịch sử biến động')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'history'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    <span>Lịch sử biến động</span>
                  </div>
                  {activeMenu === 'history' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('suppliers', 'Nhà cung cấp')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'suppliers'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">store</span>
                    <span>Nhà cung cấp</span>
                  </div>
                  {activeMenu === 'suppliers' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Group 4: KHÁCH HÀNG & KHUYẾN MẠI */}
            <div>
              <div className="px-4 pb-1.5 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                KHÁCH HÀNG &amp; KHUYẾN MẠI
              </div>
              <div className="space-y-0.5 px-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('crm', 'Khách hàng (CRM)')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'crm' || activeMenu === 'customer-detail' || activeMenu === 'khach-hang-detail' || activeMenu === 'customers'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>Khách hàng (CRM)</span>
                  </div>
                  {(activeMenu === 'crm' || activeMenu === 'customer-detail' || activeMenu === 'khach-hang-detail' || activeMenu === 'customers') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('vouchers', 'Quản lý Voucher')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'vouchers'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                    <span>Quản lý Voucher</span>
                  </div>
                  {activeMenu === 'vouchers' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Group 5: HỆ THỐNG & PHÂN QUYỀN */}
            <div>
              <div className="px-4 pb-1.5 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                HỆ THỐNG &amp; PHÂN QUYỀN
              </div>
              <div className="space-y-0.5 px-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('employees', 'Tài khoản nhân viên')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'employees'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                    <span>Tài khoản nhân viên</span>
                  </div>
                  {activeMenu === 'employees' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('rbac', 'Vai trò & Quyền (RBAC)')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'rbac'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    <span>Vai trò &amp; Quyền (RBAC)</span>
                  </div>
                  {activeMenu === 'rbac' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('audit', 'Nhật ký thao tác (Audit)')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'audit'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    <span>Nhật ký thao tác (Audit)</span>
                  </div>
                  {activeMenu === 'audit' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('policies', 'Nội dung & Chính sách')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeMenu === 'policies'
                      ? 'bg-[#E5C358] text-[#111814] font-bold shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">policy</span>
                    <span>Nội dung &amp; Chính sách</span>
                  </div>
                  {activeMenu === 'policies' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#111814]"></span>
                  )}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3.5 border-t border-[#163829] bg-[#071A12]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#123A29] flex-shrink-0 flex items-center justify-center text-[#E5C358] font-bold text-xs">
                MA
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-[12px] font-semibold text-white truncate leading-tight">
                  Master Admin
                </span>
                <span className="text-[10px] text-[#E5C358] truncate uppercase">
                  Quản trị viên
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                showToast('Đã đăng xuất khỏi phiên làm việc Quản trị viên');
                setCurrentScreen('home');
              }}
              className="text-white/60 hover:text-white transition-colors p-1"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT WRAPPER WITH PADDING-LEFT [260px] */}
      <div className="pl-0 lg:pl-[260px]">
        {/* FIXED HEADER */}
        <header className="fixed top-0 left-0 lg:left-[260px] right-0 z-40 bg-white font-['Plus_Jakarta_Sans',sans-serif]">
          {/* Top Header Row (64px) */}
          <div className="h-[64px] bg-[#FFFFFF] border-b border-[#E2E5DE] flex items-center justify-between px-4 sm:px-6">
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 text-[#0B2419] hover:bg-[#F5F6F2] rounded-lg transition-colors"
                title="Mở menu quản trị"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
              <span className="font-['Playfair_Display',serif] font-bold text-base text-[#0B2419]">
                FIDO ADMIN
              </span>
            </div>

            <div className="hidden lg:block text-xs text-[#606863]">
              Hệ thống vận hành Atelier Vert &bull; Quản trị đơn hàng bưu kiện COD
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-3 sm:gap-5 ml-auto">
              <button
                type="button"
                onClick={() => setCurrentScreen('home')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2419] hover:text-[#1B5038] px-3 py-1.5 rounded-lg border border-[#E2E5DE] hover:bg-[#F5F6F2] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Xem website</span>
              </button>

              <button
                type="button"
                onClick={() => showToast('Thông báo: Có 2 đơn hàng mới yêu cầu lên gấu quần!')}
                className="relative p-2 text-[#424844] hover:text-[#0B2419] transition-colors"
                title="Thông báo"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#BA1A1A]"></span>
              </button>

              <div className="flex items-center gap-2.5 pl-3 border-l border-[#E2E5DE]">
                <div className="w-8 h-8 rounded-full bg-[#0B2419] text-[#E5C358] flex items-center justify-center font-bold text-xs flex-shrink-0">
                  MA
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#0B2419] leading-tight">Master Admin</span>
                  <span className="text-[10px] text-[#606863] leading-tight">Quản trị viên</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumb Row (42px) */}
          <div className="h-[42px] bg-[#F5F6F2] border-b border-[#E2E5DE] flex items-center px-4 sm:px-6">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#606863]">
              <span>Hệ thống Quản trị</span>
              <span className="text-[#A3AAA5]">/</span>
              <span className="text-[#0B2419] font-semibold">{activeBreadcrumb}</span>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA (padding-top: 106px for the 64px + 42px headers) */}
        <main className="w-full bg-[#f8faf4] px-4 sm:px-6 py-6 min-h-screen" style={{ paddingTop: '116px' }}>
          <div className="flex flex-col w-full space-y-6">
            {/* 1. Dashboard */}
            {activeMenu === 'dashboard' && (
              <AdminDashboardView onNavigateTab={handleNavClick} showToast={showToast} />
            )}

            {/* 2. Sản phẩm */}
            {activeMenu === 'products' && (
              <AdminProductsView
                onSelectProduct={(id) => navigate(`/admin/products/${encodeURIComponent(id)}`)}
                onEditProduct={(id) => navigate(`/admin/products/${encodeURIComponent(id)}`)}
                onNavigateTab={handleNavClick}
                showToast={showToast}
              />
            )}

            {/* 3. Chi tiết Sản phẩm & Ma trận Biến thể */}
            {(activeMenu === 'product-detail' || activeMenu === 'san-pham-detail') && (
              <AdminProductDetailView onNavigateTab={handleNavClick} showToast={showToast} />
            )}

            {/* 4. Danh mục / Thương hiệu / Hệ size / Màu sắc */}
            {activeMenu === 'categories' && (
              <AdminCatalogMetaView initialTab="categories" onNavigateTab={handleNavClick} showToast={showToast} />
            )}
            {activeMenu === 'brands' && (
              <AdminCatalogMetaView initialTab="brands" onNavigateTab={handleNavClick} showToast={showToast} />
            )}
            {activeMenu === 'sizes' && (
              <AdminCatalogMetaView initialTab="sizes" onNavigateTab={handleNavClick} showToast={showToast} />
            )}
            {activeMenu === 'colors' && (
              <AdminCatalogMetaView initialTab="colors" onNavigateTab={handleNavClick} showToast={showToast} />
            )}

            {/* 5. Phiếu nhập kho */}
            {activeMenu === 'inward' && (
              <AdminInwardView showToast={showToast} onNavigateTab={handleNavClick} />
            )}

            {/* 6. Tồn kho & Lịch sử biến động */}
            {(activeMenu === 'inventory' || activeMenu === 'history') && (
              <AdminInventoryView showToast={showToast} />
            )}

            {/* 7. Nhà cung cấp */}
            {activeMenu === 'suppliers' && (
              <AdminSuppliersView showToast={showToast} onNavigateTab={handleNavClick} />
            )}

            {/* 8. Khách hàng (CRM) */}
            {(activeMenu === 'crm' || activeMenu === 'customers') && (
              <AdminCustomersView onNavigateTab={handleNavClick} showToast={showToast} />
            )}

            {/* 9. Chi tiết Khách hàng VIP */}
            {(activeMenu === 'customer-detail' || activeMenu === 'khach-hang-detail') && (
              <AdminCustomerDetailView onNavigateTab={handleNavClick} showToast={showToast} />
            )}

            {/* 10. Quản lý Voucher */}
            {activeMenu === 'vouchers' && (
              <AdminVouchersView showToast={showToast} />
            )}

            {/* 11. Tài khoản nhân viên */}
            {(activeMenu === 'employees' || activeMenu === 'staff') && (
              <AdminStaffView showToast={showToast} />
            )}

            {/* 12. Vai trò & Quyền (RBAC) */}
            {(activeMenu === 'rbac' || activeMenu === 'roles') && (
              <AdminRolesView showToast={showToast} />
            )}

            {/* 13. Nhật ký thao tác (Audit) */}
            {activeMenu === 'audit' && (
              <AdminAuditView showToast={showToast} />
            )}

            {/* 14. Báo cáo & Thống kê */}
            {activeMenu === 'reports' && (
              <AdminReportsView showToast={showToast} />
            )}

            {/* 15. Nội dung & Chính sách / Cài đặt */}
            {(activeMenu === 'policies' || activeMenu === 'settings') && (
              <AdminSettingsView showToast={showToast} />
            )}

            {/* 16. Chi tiết Đơn hàng (Screen 4) */}
            {(activeMenu === 'order-detail' || activeMenu === 'don-hang-detail') && (
              <AdminOrderDetailView onNavigateTab={handleNavClick} showToast={showToast} />
            )}

            {/* 17. Đơn hàng & Điều phối Cắt may (Orders & Tailoring Queue) */}
            {(activeMenu === 'orders' || activeMenu === 'tailoring') && (
              <>
                {/* Section Title & Operations Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2E5DE]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-['Playfair_Display',serif] font-bold text-[#0B2419]">
                      Quản Trị Đơn Hàng &amp; Điều Phối Cắt May COD
                    </h1>
                    <p className="text-xs text-[#606863] mt-0.5">
                      Theo dõi tiến độ duyệt đơn, xuất bưu kiện giao nhận tiền mặt và phân công thợ may cắt gấu quần
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => showToast('Đang xuất tệp Excel danh sách đơn hàng & đối soát COD...')}
                      className="px-3.5 py-2 border border-[#E2E5DE] bg-white hover:bg-[#F5F6F2] text-xs font-semibold text-[#0B2419] rounded flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Xuất File Excel
                    </button>
                    <button
                      onClick={() => showToast('Mở cửa sổ tiếp nhận đơn may đo thủ công')}
                      className="px-3.5 py-2 bg-[#0B2419] hover:bg-[#123A29] text-[#E5C358] text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Tạo Đơn Thủ Công
                    </button>
                  </div>
                </div>

                {/* 4 KPI Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <div
                    onClick={() => {
                      setFilterStatus('all');
                      setTailoringOnly(false);
                    }}
                    className="bg-white border border-[#E2E5DE] rounded-lg p-4 shadow-2xs hover:border-[#0B2419]/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-[#606863] mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">Tổng Tiền COD</span>
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-[#0B2419]">
                      {totalRevenue.toLocaleString('vi-VN')}₫
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium mt-2 inline-block">
                      Tỷ lệ hoàn thành: 98.2%
                    </span>
                  </div>

                  {/* Metric 2 */}
                  <div
                    onClick={() => {
                      setFilterStatus('pending');
                      setTailoringOnly(false);
                    }}
                    className={`bg-white border rounded-lg p-4 shadow-2xs cursor-pointer transition-all ${
                      filterStatus === 'pending'
                        ? 'border-amber-600 ring-2 ring-amber-500/20'
                        : 'border-[#E2E5DE] hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-amber-700 mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">Chờ Duyệt &amp; May</span>
                      <span className="material-symbols-outlined text-[18px]">content_cut</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700">
                      {pendingOrders}
                    </div>
                    <span className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded font-medium mt-2 inline-block">
                      ✂ Có {tailoringCount} đơn cần lên gấu
                    </span>
                  </div>

                  {/* Metric 3 */}
                  <div
                    onClick={() => {
                      setFilterStatus('shipping');
                      setTailoringOnly(false);
                    }}
                    className={`bg-white border rounded-lg p-4 shadow-2xs cursor-pointer transition-all ${
                      filterStatus === 'shipping'
                        ? 'border-sky-600 ring-2 ring-sky-500/20'
                        : 'border-[#E2E5DE] hover:border-sky-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sky-700 mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">Đang Giao Bưu Kiện</span>
                      <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-sky-700">
                      {shippingOrders}
                    </div>
                    <span className="text-[10px] text-sky-900 bg-sky-50 px-1.5 py-0.5 rounded font-medium mt-2 inline-block">
                      Hỏa tốc nội thành
                    </span>
                  </div>

                  {/* Metric 4 */}
                  <div
                    onClick={() => {
                      setFilterStatus('delivered');
                      setTailoringOnly(false);
                    }}
                    className={`bg-white border rounded-lg p-4 shadow-2xs cursor-pointer transition-all ${
                      filterStatus === 'delivered'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                        : 'border-[#E2E5DE] hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-emerald-800 mb-1.5">
                      <span className="text-[11px] uppercase tracking-wider font-semibold">Đã Thu Tiền COD</span>
                      <span className="material-symbols-outlined text-[18px]">task_alt</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-800">
                      {completedOrders}
                    </div>
                    <span className="text-[10px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded font-medium mt-2 inline-block">
                      Tiền mặt đã vào sổ quỹ
                    </span>
                  </div>
                </div>

                {/* Hemming Tailoring Alert */}
                {tailoringCount > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">content_cut</span>
                      </div>
                      <div>
                        <span className="font-bold">Lưu ý cho Thợ May &amp; Quản Đốc:</span> Đang có{' '}
                        <strong className="underline">{tailoringCount} đơn hàng</strong> yêu cầu cắt lên gấu theo chiều cao khách hàng trước khi xuất kho.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFilterStatus('tailoring');
                        setTailoringOnly(true);
                      }}
                      className="px-3 py-1.5 bg-amber-800 text-white font-semibold text-[11px] uppercase tracking-wider rounded hover:bg-amber-900 shrink-0 self-start sm:self-center transition-colors"
                    >
                      Lọc Đơn Cần May ({tailoringCount})
                    </button>
                  </div>
                )}

                {/* Table Card */}
                <div className="bg-white border border-[#E2E5DE] rounded-lg shadow-2xs overflow-hidden">
                  {/* Filter Tabs & Search */}
                  <div className="p-4 border-b border-[#E2E5DE] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none text-xs">
                      <button
                        onClick={() => {
                          setFilterStatus('all');
                          setTailoringOnly(false);
                        }}
                        className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
                          filterStatus === 'all' && !tailoringOnly
                            ? 'bg-[#0B2419] text-white font-semibold'
                            : 'bg-[#F5F6F2] text-[#606863] hover:text-[#0B2419]'
                        }`}
                      >
                        Tất cả ({orders.length})
                      </button>

                      <button
                        onClick={() => {
                          setFilterStatus('pending');
                          setTailoringOnly(false);
                        }}
                        className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
                          filterStatus === 'pending'
                            ? 'bg-[#0B2419] text-white font-semibold'
                            : 'bg-[#F5F6F2] text-[#606863] hover:text-[#0B2419]'
                        }`}
                      >
                        Chờ duyệt ({pendingOrders})
                      </button>

                      <button
                        onClick={() => {
                          setFilterStatus('tailoring');
                          setTailoringOnly(true);
                        }}
                        className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                          tailoringOnly
                            ? 'bg-amber-800 text-white font-semibold'
                            : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">content_cut</span>
                        Cần lên gấu ({tailoringCount})
                      </button>

                      <button
                        onClick={() => {
                          setFilterStatus('shipping');
                          setTailoringOnly(false);
                        }}
                        className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
                          filterStatus === 'shipping'
                            ? 'bg-[#0B2419] text-white font-semibold'
                            : 'bg-[#F5F6F2] text-[#606863] hover:text-[#0B2419]'
                        }`}
                      >
                        Đang giao ({shippingOrders})
                      </button>

                      <button
                        onClick={() => {
                          setFilterStatus('delivered');
                          setTailoringOnly(false);
                        }}
                        className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
                          filterStatus === 'delivered'
                            ? 'bg-[#0B2419] text-white font-semibold'
                            : 'bg-[#F5F6F2] text-[#606863] hover:text-[#0B2419]'
                        }`}
                      >
                        Đã giao ({completedOrders})
                      </button>

                      <button
                        onClick={() => {
                          setFilterStatus('cancelled');
                          setTailoringOnly(false);
                        }}
                        className={`px-3 py-1.5 rounded font-medium whitespace-nowrap transition-colors ${
                          filterStatus === 'cancelled'
                            ? 'bg-[#0B2419] text-white font-semibold'
                            : 'bg-[#F5F6F2] text-[#606863] hover:text-[#0B2419]'
                        }`}
                      >
                        Đã hủy ({orders.filter((o) => isCancelled(o.status)).length})
                      </button>
                    </div>

                    {/* Search bar in table */}
                    <div className="relative min-w-[260px]">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm mã đơn, tên, số điện thoại..."
                        className="w-full text-xs pl-8 pr-4 py-2 border border-[#E2E5DE] rounded bg-[#F5F6F2] focus:outline-none focus:border-[#0B2419]"
                      />
                      <span className="material-symbols-outlined absolute left-2.5 top-2 text-base text-[#606863]">
                        search
                      </span>
                    </div>
                  </div>

                  {/* Batch Action Toolbar */}
                  {selectedOrderIds.length > 0 && (
                    <div className="bg-[#FFFDF5] border-b border-[#E2E5DE] p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B2419]">
                          Đã chọn {selectedOrderIds.length} / {filteredOrders.length} đơn hàng
                        </span>
                        <button
                          onClick={() => setSelectedOrderIds([])}
                          className="text-[11px] text-[#606863] underline hover:text-[#0B2419]"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBatchApprove}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] uppercase tracking-wider rounded flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">done_all</span>
                          Duyệt đơn hàng loạt
                        </button>
                        <button
                          onClick={handleBatchShip}
                          className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold text-[11px] uppercase tracking-wider rounded flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">local_shipping</span>
                          Gán bưu tá giao hàng
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F5F6F2] border-b border-[#E2E5DE] text-[11px] font-bold uppercase tracking-wider text-[#606863]">
                          <th className="py-3.5 px-4 w-10">
                            <input
                              type="checkbox"
                              checked={
                                filteredOrders.length > 0 &&
                                selectedOrderIds.length === filteredOrders.length
                              }
                              onChange={handleSelectAll}
                              className="rounded border-[#E2E5DE]"
                            />
                          </th>
                          <th className="py-3.5 px-4">Mã đơn &amp; Thời gian</th>
                          <th className="py-3.5 px-4">Người nhận &amp; Địa chỉ</th>
                          <th className="py-3.5 px-4">Sản phẩm &amp; Yêu cầu may đo</th>
                          <th className="py-3.5 px-4">Tiền COD</th>
                          <th className="py-3.5 px-4">Trạng thái vận hành</th>
                          <th className="py-3.5 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E5DE]">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-[#606863]">
                              <span className="material-symbols-outlined text-4xl mb-2 text-[#A3AAA5] block">
                                inventory_2
                              </span>
                              Không tìm thấy đơn hàng nào khớp với điều kiện lọc.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((order) => {
                            const recipientName = order.recipient?.fullName || order.customerName;
                            const recipientPhone = order.recipient?.phone || order.customerPhone;
                            const recipientAddress = order.recipient?.address || order.recipientAddress;
                            const totalVal = order.totalAmount ?? order.total;
                            const hasTailoring = orderHasTailoring(order);
                            const isSelected = selectedOrderIds.includes(order.id);

                            return (
                              <tr
                                key={order.id}
                                className={`hover:bg-[#F5F6F2]/70 transition-colors ${
                                  isSelected ? 'bg-amber-50/60' : ''
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-4 px-4 align-top">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectRow(order.id)}
                                    className="rounded border-[#E2E5DE]"
                                  />
                                </td>

                                {/* Order ID */}
                                <td className="py-4 px-4 align-top">
                                  <button
                                    onClick={() => openDetailDrawer(order)}
                                    className="font-mono font-bold text-[#0B2419] hover:underline block text-left"
                                  >
                                    {order.id}
                                  </button>
                                  <div className="text-[11px] text-[#606863] mt-0.5">{order.createdAt}</div>
                                  <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5F6F2] text-[#0B2419]">
                                    COD (Tiền mặt)
                                  </span>
                                </td>

                                {/* Customer info */}
                                <td className="py-4 px-4 align-top max-w-[220px]">
                                  <div className="font-semibold text-[#0B2419]">{recipientName}</div>
                                  <div className="text-[11px] font-mono text-[#606863]">{recipientPhone}</div>
                                  <div
                                    className="text-[11px] text-[#606863] line-clamp-2 mt-0.5"
                                    title={recipientAddress}
                                  >
                                    {recipientAddress}
                                  </div>
                                  {order.deliveryNote && (
                                    <div className="text-[10px] text-[#606863] italic mt-1 bg-white p-1 rounded border border-[#E2E5DE]">
                                      💬 &quot;{order.deliveryNote}&quot;
                                    </div>
                                  )}
                                </td>

                                {/* Products & Tailoring */}
                                <td className="py-4 px-4 align-top">
                                  <div className="space-y-2">
                                    {order.items.map((item, idx) => {
                                      const itemName = item.name || item.product?.name;
                                      const colorVal = item.selectedColor || item.color;
                                      const sizeVal = item.selectedSize || item.size;
                                      const tailoringNote = item.customTailoringNote;

                                      return (
                                        <div key={idx} className="text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-[#0B2419]">{itemName}</span>
                                            <span className="text-[#606863]">
                                              ({colorVal} / {sizeVal})
                                            </span>
                                            <span className="font-bold text-[#0B2419]">x{item.quantity}</span>
                                          </div>

                                          {tailoringNote && (
                                            <div className="mt-1 flex items-center gap-1 px-2 py-0.5 bg-amber-100/90 border border-amber-300 text-amber-950 rounded font-semibold text-[11px]">
                                              <span className="material-symbols-outlined text-[13px] text-amber-700">
                                                content_cut
                                              </span>
                                              <span>Cắt gấu: {tailoringNote}</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>

                                {/* Amount */}
                                <td className="py-4 px-4 align-top">
                                  <div className="font-bold font-mono text-[#0B2419] text-sm">
                                    {totalVal.toLocaleString('vi-VN')}₫
                                  </div>
                                  <div className="text-[10px] mt-0.5">
                                    {isCompleted(order.status) ? (
                                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 py-0.5 rounded">
                                        ✓ Đã thu tiền COD
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                                        Chưa thu tiền
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-4 px-4 align-top">
                                  <select
                                    value={
                                      isPending(order.status)
                                        ? 'processing'
                                        : isShipping(order.status)
                                        ? 'shipping'
                                        : isCompleted(order.status)
                                        ? 'delivered'
                                        : 'cancelled'
                                    }
                                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                    className={`text-[11px] font-semibold px-2 py-1 border rounded focus:outline-none ${
                                      isPending(order.status)
                                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                                        : isShipping(order.status)
                                        ? 'bg-sky-50 border-sky-300 text-sky-900'
                                        : isCompleted(order.status)
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : 'bg-rose-50 border-rose-300 text-rose-900'
                                    }`}
                                  >
                                    <option value="processing">⏳ Chờ duyệt &amp; May</option>
                                    <option value="shipping">🚚 Đang vận chuyển</option>
                                    <option value="delivered">✓ Đã giao &amp; Thu COD</option>
                                    <option value="cancelled">✕ Hủy đơn hàng</option>
                                  </select>

                                  {hasTailoring && (
                                    <div className="text-[10px] text-amber-800 font-semibold mt-1">
                                      ⚠ Cần thợ may kiểm tra
                                    </div>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-4 align-top text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isPending(order.status) && (
                                      <button
                                        onClick={() => handleStatusChange(order.id, 'PREPARING')}
                                        className="px-2.5 py-1 bg-emerald-700 text-white font-medium text-[11px] rounded hover:bg-emerald-800 transition-colors"
                                        title="Duyệt đơn này"
                                      >
                                        Duyệt
                                      </button>
                                    )}

                                    <button
                                      onClick={() => openDetailDrawer(order)}
                                      className="px-2.5 py-1 bg-[#F5F6F2] hover:bg-[#0B2419] hover:text-white text-[#0B2419] font-medium text-[11px] rounded transition-colors"
                                      title="Xem nhanh chi tiết đơn"
                                    >
                                      Xem nhanh
                                    </button>

                                    <button
                                      onClick={() => navigate(`/admin/orders/${encodeURIComponent(order.id)}`)}
                                      className="px-2.5 py-1 bg-[#0B2419] hover:bg-[#1B5038] text-[#E5C358] font-medium text-[11px] rounded transition-colors"
                                      title="Mở toàn trang chi tiết đơn hàng (Screen 4)"
                                    >
                                      Trang đơn
                                    </button>

                                    <button
                                      onClick={() => setPrintOrder(order)}
                                      className="p-1 border border-[#E2E5DE] rounded hover:bg-[#F5F6F2] text-[#606863] hover:text-[#0B2419] transition-colors"
                                      title="In phiếu bưu kiện COD"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">print</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* SLIDEOUT ORDER DETAIL DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-[#E2E5DE]">
            {/* Header */}
            <div className="p-5 bg-[#0B2419] text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#E5C358]">
                  CHI TIẾT ĐƠN HÀNG COD
                </span>
                <h3 className="font-mono text-lg font-bold">{selectedOrder.id}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const orderId = selectedOrder.id;
                    setSelectedOrder(null);
                    navigate(`/admin/orders/${encodeURIComponent(orderId)}`);
                  }}
                  className="px-2.5 py-1 bg-[#E5C358] text-[#0B2419] hover:bg-[#d8b548] text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                  title="Mở toàn màn hình theo bố cục Admin Screen 4"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Toàn trang
                </button>
                <button
                  onClick={() => setPrintOrder(selectedOrder)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded flex items-center gap-1 text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  In phiếu
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-white/70 hover:text-white rounded"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Status Selector */}
              <div className="bg-[#F5F6F2] border border-[#E2E5DE] rounded-lg p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#606863] block mb-2">
                  Trạng Thái Xử Lý Đơn Hàng
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'PREPARING')}
                    className={`py-2 px-2 text-center font-semibold rounded border transition-all ${
                      isPending(selectedOrder.status)
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-[#0B2419] border-[#E2E5DE] hover:bg-[#F5F6F2]'
                    }`}
                  >
                    1. Đã duyệt
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'SHIPPING')}
                    className={`py-2 px-2 text-center font-semibold rounded border transition-all ${
                      isShipping(selectedOrder.status)
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-[#0B2419] border-[#E2E5DE] hover:bg-[#F5F6F2]'
                    }`}
                  >
                    2. Đang giao
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'COMPLETED')}
                    className={`py-2 px-2 text-center font-semibold rounded border transition-all ${
                      isCompleted(selectedOrder.status)
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-[#0B2419] border-[#E2E5DE] hover:bg-[#F5F6F2]'
                    }`}
                  >
                    3. Đã thu COD
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'CANCELLED')}
                    className={`py-2 px-2 text-center font-semibold rounded border transition-all ${
                      isCancelled(selectedOrder.status)
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-[#0B2419] border-[#E2E5DE] hover:bg-[#F5F6F2]'
                    }`}
                  >
                    4. Hủy đơn
                  </button>
                </div>
              </div>

              {/* Tailoring alert if present */}
              {orderHasTailoring(selectedOrder) && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-700">content_cut</span>
                    Chỉ Dẫn May Đo Lên Gấu Quần Miễn Phí
                  </div>
                  <div className="text-xs text-amber-950 space-y-1">
                    {selectedOrder.items
                      .filter((i) => i.customTailoringNote)
                      .map((i, idx) => (
                        <p key={idx}>
                          &bull; <strong>{i.name}:</strong> {i.customTailoringNote}
                        </p>
                      ))}
                    {selectedOrder.deliveryNote && (
                      <p className="italic text-amber-900/90">
                        &bull; Ghi chú khách: {selectedOrder.deliveryNote}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2419] pb-2 border-b border-[#E2E5DE] mb-3">
                  Danh Sách Trang Phục ({selectedOrder.items.length})
                </h4>
                <div className="divide-y divide-[#E2E5DE]">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl || item.product?.imageUrl}
                          alt={item.name}
                          className="w-12 h-14 object-cover object-top rounded border border-[#E2E5DE]"
                        />
                        <div>
                          <div className="font-bold text-[#0B2419]">{item.name}</div>
                          <div className="text-[11px] text-[#606863]">
                            Màu: {item.selectedColor || item.color} | Size: {item.selectedSize || item.size} | SL: {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-[#0B2419]">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipient Details & Edit */}
              <div className="bg-white border border-[#E2E5DE] rounded-lg p-4">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E2E5DE]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2419]">
                    Thông Tin Người Nhận Bưu Kiện
                  </h4>
                  <button
                    onClick={() => setIsEditingRecipient(!isEditingRecipient)}
                    className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isEditingRecipient ? 'close' : 'edit'}
                    </span>
                    {isEditingRecipient ? 'Hủy sửa' : 'Chỉnh sửa'}
                  </button>
                </div>

                {isEditingRecipient ? (
                  <form onSubmit={handleSaveRecipient} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">
                        Họ tên khách hàng
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-xs p-2 border border-[#E2E5DE] rounded bg-[#F5F6F2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">
                        Số điện thoại người nhận
                      </label>
                      <input
                        type="tel"
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full text-xs p-2 border border-[#E2E5DE] rounded bg-[#F5F6F2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">
                        Địa chỉ giao hàng đầy đủ
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full text-xs p-2 border border-[#E2E5DE] rounded bg-[#F5F6F2]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">
                        Ghi chú bưu tá giao nhận
                      </label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full text-xs p-2 border border-[#E2E5DE] rounded bg-[#F5F6F2]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#0B2419] text-white font-semibold uppercase tracking-wider rounded"
                    >
                      Lưu Thay Đổi Thông Tin
                    </button>
                  </form>
                ) : (
                  <div className="text-xs text-[#0B2419]/80 space-y-1.5">
                    <p>
                      <span className="font-semibold text-[#0B2419]">Họ và tên:</span>{' '}
                      {selectedOrder.recipient?.fullName || selectedOrder.customerName}
                    </p>
                    <p>
                      <span className="font-semibold text-[#0B2419]">Điện thoại:</span>{' '}
                      <span className="font-mono">{selectedOrder.recipient?.phone || selectedOrder.customerPhone}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-[#0B2419]">Địa chỉ:</span>{' '}
                      {selectedOrder.recipient?.address || selectedOrder.recipientAddress}
                    </p>
                    <p>
                      <span className="font-semibold text-[#0B2419]">Hình thức COD:</span> Đồng kiểm, cho khách thử đồ trước khi thanh toán tiền mặt.
                    </p>
                  </div>
                )}
              </div>

              {/* Financial Calculation */}
              <div className="bg-[#F5F6F2] border border-[#E2E5DE] rounded-lg p-4 text-xs space-y-2">
                <div className="flex justify-between text-[#606863]">
                  <span>Tạm tính tiền hàng:</span>
                  <span className="font-mono">{selectedOrder.subtotal.toLocaleString('vi-VN')}₫</span>
                </div>
                {selectedOrder.voucherDiscount ? (
                  <div className="flex justify-between text-emerald-800">
                    <span>Ưu đãi voucher ({selectedOrder.voucherCode}):</span>
                    <span className="font-mono">-{selectedOrder.voucherDiscount.toLocaleString('vi-VN')}₫</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-[#606863]">
                  <span>Phí bưu kiện hỏa tốc:</span>
                  <span className="font-mono">{selectedOrder.shippingFee.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="pt-2 border-t border-[#E2E5DE] flex justify-between font-bold text-sm text-[#0B2419]">
                  <span>Tổng tiền bưu tá thu COD:</span>
                  <span className="font-mono text-base text-[#0B2419]">
                    {(selectedOrder.totalAmount ?? selectedOrder.total).toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F5F6F2] border-t border-[#E2E5DE] flex items-center justify-between gap-3 sticky bottom-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-[#E2E5DE] rounded text-xs font-semibold uppercase hover:bg-white"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setPrintOrder(selectedOrder);
                }}
                className="px-5 py-2 bg-[#0B2419] text-[#E5C358] text-xs font-semibold uppercase tracking-wider rounded hover:bg-[#123A29] flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                In Phiếu Bưu Kiện COD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SLIP MODAL */}
      {printOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full p-6 border-2 border-[#0B2419] rounded-lg shadow-2xl relative">
            <button
              onClick={() => setPrintOrder(null)}
              className="absolute top-4 right-4 text-[#606863] hover:text-[#0B2419]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="text-center pb-4 border-b-2 border-dashed border-[#E2E5DE] mb-4">
              <div className="font-['Playfair_Display',serif] font-bold text-lg text-[#0B2419]">
                ATELIER VERT &bull; PHIẾU ĐÓNG GÓI &amp; GIAO HÀNG COD
              </div>
              <div className="text-xs text-[#606863] font-mono mt-0.5">
                MÃ VẬN ĐƠN: {printOrder.id} &bull; {printOrder.createdAt}
              </div>
            </div>

            <div className="text-xs space-y-3 mb-6">
              <div>
                <span className="font-bold text-[#0B2419] block">NGƯỜI NHẬN:</span>
                <div>
                  {printOrder.recipient?.fullName || printOrder.customerName} - {printOrder.recipient?.phone || printOrder.customerPhone}
                </div>
                <div className="text-[#606863]">{printOrder.recipient?.address || printOrder.recipientAddress}</div>
              </div>

              {orderHasTailoring(printOrder) && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 font-bold text-amber-900 rounded">
                  ✂ YÊU CẦU THỢ MAY XƯỞNG: ĐÃ HOÀN TẤT LÊN GẤU THEO CHIỀU CAO KHÁCH HÀNG.
                </div>
              )}

              <div>
                <span className="font-bold text-[#0B2419] block mb-1">CHI TIẾT SẢN PHẨM:</span>
                <ul className="divide-y divide-[#E2E5DE] border border-[#E2E5DE] rounded p-2 space-y-1">
                  {printOrder.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between py-1">
                      <span>
                        {it.name} ({it.selectedColor || it.color}, {it.selectedSize || it.size}) x{it.quantity}
                      </span>
                      <span className="font-mono">{(it.price * it.quantity).toLocaleString('vi-VN')}₫</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-[#F5F6F2] border border-[#E2E5DE] rounded flex justify-between items-center text-sm font-bold">
                <span>TIỀN MẶT BƯU TÁ THU (COD):</span>
                <span className="font-mono text-base text-[#0B2419]">
                  {(printOrder.totalAmount ?? printOrder.total).toLocaleString('vi-VN')}₫
                </span>
              </div>

              <p className="text-[10px] text-center text-[#606863] italic">
                Khách hàng được quyền mở kiện và thử đồ trước khi thanh toán. Cảm ơn quý khách đã đồng hành cùng Atelier Vert.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E5DE]">
              <button
                onClick={() => setPrintOrder(null)}
                className="px-4 py-2 border border-[#E2E5DE] rounded text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  showToast('Đang gửi lệnh in tới máy in nhiệt bưu cục...');
                  setPrintOrder(null);
                }}
                className="px-5 py-2 bg-[#0B2419] text-[#E5C358] text-xs font-semibold uppercase tracking-wider rounded"
              >
                In Phiếu Bưu Kiện Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
