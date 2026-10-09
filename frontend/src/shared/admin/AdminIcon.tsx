const paths: Record<string, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  receipt_long: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 7h6 M9 11h6 M9 15h3',
  styler: 'M8 3l4 3 4-3 6 4-3 5-3-2v11H8V10l-3 2-3-5z',
  category: 'M3 4h7v6H3z M14 4h7v6h-7z M3 14h7v6H3z M14 14h7v6h-7z',
  verified: 'M12 3l3 3 4 1 1 5-2 4-6 5-6-5-2-4 1-5 4-1z M8 12l3 3 5-6',
  straighten: 'M3 8h18v8H3z M7 8v4 M11 8v3 M15 8v4 M19 8v3',
  palette: 'M12 3a9 9 0 100 18h2a2 2 0 000-4h-1a2 2 0 010-4h5a3 3 0 003-3 9 9 0 00-9-7z M7 10h.01 M10 6h.01 M15 7h.01',
  inventory_2: 'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
  move_to_inbox: 'M3 13h5l2 4h4l2-4h5 M5 5h14l2 8v8H3v-8z M12 3v8 M9 8l3 3 3-3',
  local_shipping: 'M3 5h11v12H3z M14 9h4l3 4v4h-7 M7 17a2 2 0 100 4 2 2 0 000-4 M17 17a2 2 0 100 4 2 2 0 000-4',
  groups: 'M8 4a3 3 0 110 6 3 3 0 010-6 M16 4a3 3 0 110 6 3 3 0 010-6 M2 21v-5a5 5 0 0110 0v5 M14 12a5 5 0 018 4v5',
  badge: 'M5 5h14v16H5z M9 3h6v4H9z M12 10a2 2 0 110 4 2 2 0 010-4 M8 19a4 4 0 018 0',
  admin_panel_settings: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M9 12l2 2 4-4',
  history: 'M3 11a9 9 0 119 10 M3 4v7h7 M12 7v6l4 2',
  monitoring: 'M3 3v18h18 M6 16l5-6 4 3 6-8',
  article: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
  storefront: 'M3 9l2-6h14l2 6v3H3z M5 12v9h14v-9 M9 21v-6h6v6',
  arrow_back: 'M20 12H4 M10 6l-6 6 6 6',
  arrow_forward: 'M4 12h16 M14 6l6 6-6 6',
  open_in_new: 'M13 3h8v8 M21 3L10 14 M10 3H3v18h18v-7',
};
export function AdminIcon({ name }: { name: string }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.dashboard} /></svg>;
}
