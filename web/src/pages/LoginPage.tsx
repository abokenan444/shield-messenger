import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { login } from '../lib/protocolClient';
import { ShieldIcon } from '../components/icons/ShieldIcon';

export function LoginPage() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      storeLogin(result.userId, result.displayName, result.publicKey);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600/20 rounded-2xl mb-4">
            <ShieldIcon className="w-10 h-10 text-primary-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shield Messenger</h1>
          <p className="text-dark-400">منصة المراسلة الخاصة والمشفرة</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              className="input-field"
              placeholder="username"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>

          <div className="text-center">
            <Link to="/register" className="text-primary-400 hover:text-primary-300 text-sm transition">
              ليس لديك حساب؟ سجّل الآن
            </Link>
          </div>
        </form>

        {/* Encryption Notice */}
        <div className="mt-6 text-center">
          <div className="encryption-badge mx-auto">
            <ShieldIcon className="w-3 h-3" />
            <span>تشفير تام بين الطرفين • E2EE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
