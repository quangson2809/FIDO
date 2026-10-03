import React from 'react';
import { useApp } from '../../../context/AppContext';

const menuItems = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'admin-products', label: 'Sản phẩm', icon: 'inventory_2' },
  { id: 'admin-orders', label: 'Đơn hàng', icon: 'receipt_long' },
] as const;

export const AdminSidebar: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0B2419] text-white">
      <div className="p-6 text-xl font-black tracking-widest text-[#E8C75B]">FIDO ADMIN</div>
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentScreen('admin')}
            className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#1B5038]"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};
