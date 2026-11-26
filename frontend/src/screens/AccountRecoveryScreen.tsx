import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PasswordOtpForm } from '../features/auth/components/PasswordOtpForm';
import { setApiAccessToken } from '../services/http/apiClient';

export function AccountRecoveryScreen() {
  const [done, setDone] = useState(false);

  return <main className="mx-auto max-w-xl space-y-5 px-4 py-12">
    <h1 className="font-serif text-3xl">Lấy lại mật khẩu</h1>
    {done ? <p role="status">Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</p> :
      <PasswordOtpForm onComplete={() => {
        setApiAccessToken(null);
        setDone(true);
      }} />}
    <Link to="/login" className="underline">Quay lại đăng nhập</Link>
  </main>;
}
