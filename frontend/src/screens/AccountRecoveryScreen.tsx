import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { securityService } from '../features/auth/api/securityService';
import { setApiAccessToken } from '../services/http/apiClient';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
export function AccountRecoveryScreen() {
  const [link, setLink] = useState(() => { const params = new URLSearchParams(window.location.hash.slice(1)); return { token: params.get('token') ?? '', purpose: params.get('purpose') ?? '' }; });
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false); const pending = useRef(false); const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const capture = () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      if (params.has('token')) {
        setLink({ token: params.get('token') ?? '', purpose: params.get('purpose') ?? '' });
        setDone(false); setError(null);
      }
      window.history.replaceState(window.history.state, '', window.location.pathname);
    };
    // Preserve the capability captured on initial navigation, then handle a second
    // email link opened into this already-mounted recovery screen.
    window.history.replaceState(window.history.state, '', window.location.pathname);
    window.addEventListener('hashchange', capture);
    return () => window.removeEventListener('hashchange', capture);
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending.current || done) return;
    if (link.token && link.purpose === 'PASSWORD_RESET' && password !== repeat) { setError('Hai mật khẩu mới chưa khớp.'); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      if (!link.token) await securityService.requestReset(email);
      else if (link.purpose === 'EMAIL_VERIFY') await securityService.verifyEmail(link.token);
      else if (link.purpose === 'PASSWORD_RESET') { await securityService.reset(link.token, password); setApiAccessToken(null); }
      else throw new Error('Liên kết không hợp lệ.');
      setPassword(''); setRepeat(''); setDone(true);
    } catch (cause: unknown) { setError(getStorefrontErrorMessage(cause, 'Liên kết không hợp lệ, đã hết hạn hoặc chưa thể gửi email.')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <main className="mx-auto max-w-xl space-y-5 px-4 py-12">
    <h1 className="font-serif text-3xl">{link.purpose === 'EMAIL_VERIFY' ? 'Xác minh email' : 'Khôi phục tài khoản'}</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {done ? <p role="status">{!link.token ? 'Nếu email đã được xác minh cho một tài khoản đang hoạt động, liên kết khôi phục sẽ được gửi tới hộp thư đó.' : link.purpose === 'EMAIL_VERIFY' ? 'Đã xác minh email. Bạn có thể dùng email này để khôi phục tài khoản.' : 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.'}</p> :
      <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
        {!link.token ? <label>Email đã xác minh<input type="email" autoComplete="email" className="field-input" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label> : link.purpose === 'PASSWORD_RESET' ? <>
          <label>Mật khẩu mới<input type="password" className="field-input" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label>Nhập lại mật khẩu mới<input type="password" className="field-input" autoComplete="new-password" required minLength={8} maxLength={128} value={repeat} onChange={e => setRepeat(e.target.value)} /></label>
        </> : <p>Chỉ xác nhận nếu bạn đã yêu cầu xác minh địa chỉ email cho tài khoản FIDO.</p>}
        <button type="submit" className="admin-primary">{busy ? 'Đang xử lý…' : !link.token ? 'Gửi liên kết khôi phục' : link.purpose === 'EMAIL_VERIFY' ? 'Xác nhận email' : 'Đặt mật khẩu mới'}</button>
      </fieldset></form>}
    <Link to="/login" className="underline">Quay lại đăng nhập</Link>
  </main>;
}
