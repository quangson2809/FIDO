import React from 'react';
import { UserHeader } from './UserHeader';
import { UserFooter } from './UserFooter';
import { CartDrawer } from '../../../screens/CartDrawer';

export const UserLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif]">
      <UserHeader />
      <main className="flex-1">{children}</main>
      <CartDrawer />
      <UserFooter />
    </div>
  );
};
