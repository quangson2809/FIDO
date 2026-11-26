import { useNavigate } from 'react-router-dom';
import { PasswordOtpForm } from './PasswordOtpForm';
import { setApiAccessToken } from '../../../services/http/apiClient';

export function AccountSecurityPanel({ email }: { email: string | null }) {
  const navigate = useNavigate();

  return <section className="space-y-4 border bg-white p-5" aria-label="Bảo mật tài khoản">
    <h2 className="font-serif text-2xl">Đổi mật khẩu</h2>
    <PasswordOtpForm key={email} authenticated email={email} onComplete={() => {
      setApiAccessToken(null);
      navigate('/login', { replace: true });
    }} />
  </section>;
}
