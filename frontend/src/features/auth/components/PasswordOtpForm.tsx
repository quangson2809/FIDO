import { useRef, useState, type FormEvent } from 'react';
import { securityService } from '../api/securityService';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';

type Props = {
  email?: string | null;
  authenticated?: boolean;
  onComplete: () => void;
};

export function PasswordOtpForm({ email, authenticated = false, onComplete }: Props) {
  const [enteredEmail, setEnteredEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef(false);
  const targetEmail = (authenticated ? email ?? '' : enteredEmail).trim();

  const sendOtp = async () => {
    if (pending.current || !targetEmail) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await securityService.sendOtp(targetEmail);
      setSentTo(targetEmail);
      setOtp('');
      setMessage('Đã gửi mã OTP về email. Mã có hiệu lực trong 2 phút.');
    } catch (cause: unknown) {
      setError(getStorefrontErrorMessage(cause, 'Chưa gửi được mã OTP. Vui lòng thử lại.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    if (sentTo !== targetEmail) {
      await sendOtp();
      return;
    }
    if (password !== repeat) {
      setError('Hai mật khẩu mới chưa khớp.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      if (authenticated) await securityService.changePassword(otp, password, repeat);
      else await securityService.reset(targetEmail, otp, password, repeat);
      setOtp('');
      setPassword('');
      setRepeat('');
      onComplete();
    } catch (cause: unknown) {
      setError(getStorefrontErrorMessage(cause, 'Chưa đổi được mật khẩu. Vui lòng kiểm tra mã OTP.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (authenticated && !targetEmail) {
    return <p>Hãy lưu email trong hồ sơ để nhận mã OTP đổi mật khẩu.</p>;
  }

  return <form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status">{message}</p>}
    <fieldset disabled={busy} className="space-y-4">
      {authenticated ? <p>Mã xác nhận được gửi tới {targetEmail}.</p> :
        <label className="block">Email tài khoản
          <input className="field-input" type="email" autoComplete="email" required maxLength={254}
            value={enteredEmail} onChange={event => {
              setEnteredEmail(event.target.value);
              setSentTo(null);
              setOtp('');
              setMessage(null);
            }} />
        </label>}
      {sentTo === targetEmail ? <>
        <button type="button" className="admin-secondary" onClick={() => void sendOtp()}>Gửi lại mã OTP</button>
        <label className="block">Mã OTP
          <input className="field-input" type="text" inputMode="numeric" autoComplete="one-time-code"
            required pattern="[0-9]{6}" minLength={6} maxLength={6}
            value={otp} onChange={event => setOtp(event.target.value)} />
        </label>
        <label className="block">Mật khẩu mới
          <input className="field-input" type="password" autoComplete="new-password" required minLength={8}
            maxLength={128} value={password} onChange={event => setPassword(event.target.value)} />
        </label>
        <label className="block">Nhập lại mật khẩu mới
          <input className="field-input" type="password" autoComplete="new-password" required minLength={8}
            maxLength={128} value={repeat} onChange={event => setRepeat(event.target.value)} />
        </label>
        <p className="text-sm">Mật khẩu từ 8 ký tự, tối đa 72 byte. Đổi thành công sẽ đăng xuất các phiên hiện tại.</p>
        <button className="admin-primary" type="submit">{busy ? 'Đang xử lý…' : authenticated ? 'Đổi mật khẩu' : 'Đặt mật khẩu mới'}</button>
      </> : <button className="admin-primary" type="submit">{busy ? 'Đang gửi…' : 'Gửi mã OTP'}</button>}
    </fieldset>
  </form>;
}
