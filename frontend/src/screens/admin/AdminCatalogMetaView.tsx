import React, { useState } from 'react';
import { mockCatalogMeta } from '../../mocks/apiData';

type Tab = 'categories' | 'brands' | 'sizes' | 'colors';

export const AdminCatalogMetaView: React.FC<{
  initialTab?: Tab;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ initialTab = 'categories', showToast }) => {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">CatalogMetaDto</div>
        <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Dữ liệu danh mục dùng chung</h1>
        <p className="text-sm text-[#687069]">Category tree, Brand, SizeSystem/SizeValue và Color từ cùng một mock source.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['categories','brands','sizes','colors'] as Tab[]).map((key)=>(
          <button key={key} onClick={()=>setTab(key)} className={`px-4 py-2 text-xs font-bold rounded ${tab===key?'bg-[#0B2419] text-white':'bg-white border'}`}>{key}</button>
        ))}
      </div>

      <section className="bg-white border border-[#E8E9E3] rounded-lg overflow-hidden">
        {tab === 'categories' && (
          <table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">category_id</th><th className="text-left">parent_category_id</th><th className="text-left">name</th></tr></thead><tbody className="divide-y">{mockCatalogMeta.categories.map(c=><tr key={c.category_id}><td className="p-3">{c.category_id}</td><td>{c.parent_category_id ?? 'null'}</td><td className="font-bold">{c.name}</td></tr>)}</tbody></table>
        )}
        {tab === 'brands' && (
          <table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">brand_id</th><th className="text-left">name</th></tr></thead><tbody className="divide-y">{mockCatalogMeta.brands.map(b=><tr key={b.brand_id}><td className="p-3">{b.brand_id}</td><td className="font-bold">{b.name}</td></tr>)}</tbody></table>
        )}
        {tab === 'sizes' && (
          <div className="p-4 grid md:grid-cols-2 gap-4">{mockCatalogMeta.size_systems.map(s=><div key={s.size_system_id} className="border rounded p-4"><div className="font-bold">{s.name} <span className="text-[#687069]">({s.code})</span></div><div className="mt-3 flex flex-wrap gap-2">{s.size_values.map(v=><span key={v.size_value_id} className="px-2 py-1 bg-[#F5F6F2] rounded text-xs">{v.display_name}</span>)}</div></div>)}</div>
        )}
        {tab === 'colors' && (
          <table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">color_id</th><th className="text-left">code</th><th className="text-left">name</th></tr></thead><tbody className="divide-y">{mockCatalogMeta.colors.map(c=><tr key={c.color_id}><td className="p-3">{c.color_id}</td><td>{c.code}</td><td className="font-bold">{c.name}</td></tr>)}</tbody></table>
        )}
      </section>

      <button onClick={()=>showToast(`Đang test thao tác CRUD mock cho ${tab}`)} className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">
        Test thao tác mock
      </button>
    </div>
  );
};
