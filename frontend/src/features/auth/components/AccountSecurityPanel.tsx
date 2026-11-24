import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { securityService } from '../api/securityService';
import { setApiAccessToken } from '../../../services/http/apiClient';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';
export function AccountSecurityPanel({ email, verified }: { email: string | null; verified: boolean }) {
  const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false); const pending = useRef(false);
  const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const change = async (event: FormEvent) => {
    event.preventDefault(); if (pending.current) return;
    if (next !== repeat) { setError('Hai mật khẩu mới chưa khớp.'); return; }
    pending.current = true; setBusy(true); setError(null); setMessage(null);
    try { await securityService.changePassword(current, next); setCurrent(''); setNext(''); setRepeat(''); setApiAccessToken(null); navigate('/login', { replace: true }); }
    catch (cause: unknown) { setError(getStorefrontErrorMessage(cause, 'Không thể đổi mật khẩu.')); }
    finally { pending.current = false; setBusy(false); }
  };
  const verify = async () => {
    if (pending.current) return; pending.current = true; setBusy(true); setError(null); setMessage(null);
    try { await securityService.requestVerification(); setMessage('Đã yêu cầu gửi liên kết xác minh. Kiểm tra hộp thư của email đã lưu.'); }
    catch (cause: unknown) { setError(getStorefrontErrorMessage(cause, 'Chưa thể gửi email xác minh.')); }
    finally { pending.current = false; setBusy(false); }
  };
  return <section className="space-y-4 border bg-white p-5" aria-label="Bảo mật tài khoản">
    <h2 className="font-serif text-2xl">Bảo mật tài khoản</h2>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status">{message}</p>}
    <p>{verified ? 'Email đã xác minh, có thể dùng khôi phục tài khoản.' : 'Email chưa xác minh. Lưu email của bạn ở hồ sơ rồi xác minh để dùng khi quên mật khẩu.'}</p>
    {!verified && <button type="button" className="admin-secondary" disabled={busy || !email} onClick={() => void verify()}>Gửi liên kết xác minh email</button>}
    <form onSubmit={change} className="grid gap-3 sm:grid-cols-2">
      <fieldset disabled={busy} className="contents">
        <label>Mật khẩu hiện tại<input className="field-input" type="password" autoComplete="current-password" required maxLength={128} value={current} onChange={e => setCurrent(e.target.value)} /></label>
        <label>Mật khẩu mới<input className="field-input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={next} onChange={e => setNext(e.target.value)} /></label>
        <label>Nhập lại mật khẩu mới<input className="field-input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={repeat} onChange={e => setRepeat(e.target.value)} /></label>
        <p className="text-sm">Mật khẩu từ 8 ký tự, tối đa 72 byte. Đổi thành công sẽ đăng xuất các phiên hiện tại.</p>
        <button className="admin-primary" type="submit">{busy ? 'Đang xử lý…' : 'Đổi mật khẩu'}</button>
      </fieldset>
    </form>
  </section>;
}
