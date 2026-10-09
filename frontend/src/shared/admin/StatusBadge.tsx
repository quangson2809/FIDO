import { statusLabel } from './statusLabels';
export function StatusBadge({ status }: { status: string }) {
  const tone = ['CANCELLED', 'DELIVERY_FAILED', 'STOPPED', 'INACTIVE'].includes(status) ? 'muted' : ['PENDING', 'DRAFT', 'UNPAID', 'PREPARING'].includes(status) ? 'pending' : 'active';
  return <span className={`admin-badge admin-badge-${tone}`}>{statusLabel(status)}</span>;
}
