import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { createIdentity } from '../lib/protocolClient';
import { ShieldIcon } from '../components/icons/ShieldIcon';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setLoading(true);

    try {
      const result = await createIdentity(username, password);
      login(result.userId, result.displayName, result.publicKey);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600/20 rounded-2xl mb-4">
            <ShieldIcon className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">إنشاء حساب</h1>
          <p className="text-dark-400">انضم إلى Shield Messenger — لا نطلب بريداً أو رقم هاتف</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              className="input-field"
              placeholder="اختر اسم مستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">كلمة المرور</label>
            <input
              type="password"
              className="input-field"
              placeholder="8 أحرف على الأقل"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">تأكيد كلمة المرور</label>
            <input
              type="password"
              className="input-field"
              placeholder="أعد إدخال كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-primary-400 hover:text-primary-300 text-sm transition">
              لديك حساب بالفعل؟ سجّل الدخول
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center space-y-2">
          <div className="encryption-badge mx-auto">
            <ShieldIcon className="w-3 h-3" />
            <span>لا نجمع أي بيانات شخصية</span>
          </div>
          <p className="text-xs text-dark-500">
            مفتوحة المصدر بالكامل • بروتوكول Shield Messenger P2P
          </p>
        </div>
      </div>
    </div>
  );
}
