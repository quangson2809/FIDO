import React from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif]">
            <AdminSidebar />
            <div className="pl-[260px]">
                <AdminHeader />
                <main className="pt-[68px] p-6">{children}</main>
            </div>
        </div>
    );
};
