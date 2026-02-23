import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname === '/chat' || location.pathname.startsWith('/chat/');
    return location.pathname.startsWith(path);
  };

  const items = [
    { path: '/chat', icon: '💬', label: t.sidebar_chats },
    { path: '/calls', icon: '📞', label: t.sidebar_calls },
    { path: '/contacts', icon: '👥', label: t.sidebar_contacts },
    { path: '/wallet', icon: '💰', label: t.wallet_title },
    { path: '/settings', icon: '⚙️', label: t.sidebar_settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-dark-900 border-t border-dark-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors
              ${isActive(item.path) ? 'text-primary-400' : 'text-dark-500'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
