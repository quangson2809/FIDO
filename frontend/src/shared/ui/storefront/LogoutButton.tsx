import { useNavigate } from 'react-router-dom';
import { useAuthSession } from '../../../features/auth/session/useAuthSession';

export function LogoutButton({ admin = false, beforeLogout, className = '' }: { admin?: boolean; beforeLogout?: () => boolean; className?: string }) {
  const { isAuthenticated, logout } = useAuthSession();
  const navigate = useNavigate();
  if (!isAuthenticated) return null;
  return <button type="button" className={`min-h-11 shrink-0 px-3 text-sm font-semibold ${className}`} onClick={() => {
    if (beforeLogout && !beforeLogout()) return;
    logout();
    navigate(admin ? '/admin/login' : '/login', { replace: true });
  }}>Đăng xuất</button>;
}
