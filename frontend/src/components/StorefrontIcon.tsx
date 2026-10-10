const paths = {
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
