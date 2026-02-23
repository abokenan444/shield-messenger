import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { useTranslation } from '../lib/i18n';
import { login } from '../lib/protocolClient';
import { ShieldIcon } from '../components/icons/ShieldIcon';

export function LoginPage() {
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      storeLogin(result.userId, result.displayName, result.publicKey);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login_failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <Link to="/home" className="inline-flex flex-col items-center gap-3 group">
            <div className="w-20 h-20 bg-primary-600/20 rounded-2xl flex items-center justify-center group-hover:bg-primary-600/30 transition">
              <ShieldIcon className="w-10 h-10 text-primary-400" />
            </div>
            <h1 className="text-3xl font-bold text-white group-hover:text-primary-400 transition">Shield Messenger</h1>
          </Link>
          <p className="text-dark-400 mt-2">{t.login_subtitle}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">{t.login_username}</label>
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
            <label className="block text-sm text-dark-300 mb-1.5">{t.login_password}</label>
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
            {loading ? t.login_loggingIn : t.login_login}
          </button>

          <div className="text-center">
            <Link to="/register" className="text-primary-400 hover:text-primary-300 text-sm transition">
              {t.login_noAccount}
            </Link>
          </div>
        </form>

        {/* Encryption Notice */}
        <div className="mt-6 text-center">
          <div className="encryption-badge mx-auto">
            <ShieldIcon className="w-3 h-3" />
            <span>{t.login_e2eNotice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
