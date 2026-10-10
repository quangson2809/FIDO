const paths = {
  chevron_left: 'm15 6-6 6 6 6',
  chevron_right: 'm9 6 6 6-6 6',
  checkroom: 'm6 3 6 3 6-3 5 6-4 3v10H5V12l-4-3z',
  local_shipping: 'M1 4h13v13H1z M14 9h4l4 5v3h-8 M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  price_check: 'M3 3h10l8 8-10 10-8-8z M7 7h.01 m3 5 2 2 4-4',
  verified: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z m-4 9 3 3 5-5',
  verified_user: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z m-4 9 3 3 5-5',
  production_quantity_limits: 'M4 7h16v14H4z M8 7V5a4 4 0 0 1 8 0v2 M8 14h8',
  delete_outline: 'M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  remove: 'M5 12h14',
  add: 'M5 12h14 M12 5v14',
  manage_accounts: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  location_on: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  home_pin: 'm3 11 9-8 9 8 M5 10v11h14V10 M10 21v-7h4v7',
  error: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v7 M12 17h.01',
  check_circle: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 m-15 0 4 4 6-7',
  receipt_long: 'M5 2h14v20l-3-2-4 2-4-2-3 2z M8 7h8 M8 12h8 M8 16h4',
  account_tree: 'M9 2h6v5H9z M2 17h6v5H2z M16 17h6v5h-6z M12 7v5 M5 17v-5h14v5',
  category: 'M4 3h6v6H4z M14 3h6v6h-6z M4 13h6v6H4z M14 13h6v6h-6z',
  arrow_outward: 'M5 19 19 5 M5 5h14v14',
  payments: 'M2 5h20v14H2z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M5 9h1 M18 15h1',
  inventory_2: 'M3 3h18v5H3z M5 8v13h14V8 M9 12h6',
  grid_view: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  expand_more: 'm6 9 6 6 6-6',
  arrow_forward: 'M4 12h16 m-6-6 6 6-6 6',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  shopping_bag: 'M4 7h16v14H4z M8 7V5a4 4 0 0 1 8 0v2',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  close: 'm5 5 14 14 M19 5 5 19',
  straighten: 'M3 7h18v10H3z M7 7v4 M12 7v6 M17 7v4',
  tune: 'M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M8 15v6',
  favorite: 'M12 21 3 12C-2 5 7 0 12 7c5-7 14-2 9 5z',
  open_in_full:
    'M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5 M4 4l6 6 M20 4l-6 6 M20 20l-6-6 M4 20l6-6',
} as const;

// Small inline icon set for storefront navigation and brand values; no font request.
export const StorefrontIcon = ({
  name,
  className = '',
}: {
  name: keyof typeof paths;
  className?: string;
}) => (
  <svg
    aria-hidden="true"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
  >
    <path d={paths[name]} />
  </svg>
);
