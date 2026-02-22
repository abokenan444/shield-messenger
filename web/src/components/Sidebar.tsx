import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { useTranslation } from '../lib/i18n';
import { ShieldIcon } from './icons/ShieldIcon';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName } = useAuthStore();
  const { t } = useTranslation();

  if (!isOpen) return null;

  const isActive = (path: string) => {
    if (path === '/chat') return location.pathname === '/chat' || location.pathname.startsWith('/chat/');
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-16 bg-dark-900 border-l border-dark-800 flex flex-col items-center py-4 gap-2">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
        <ShieldIcon className="w-6 h-6 text-white" />
      </div>

      {/* Chat */}
      <SidebarButton icon="💬" tooltip={t.sidebar_chats} active={isActive('/chat')} onClick={() => navigate('/chat')} />

      {/* Calls */}
      <SidebarButton icon="📞" tooltip={t.sidebar_calls} active={isActive('/calls')} onClick={() => navigate('/calls')} />

      {/* Contacts */}
      <SidebarButton icon="👥" tooltip={t.sidebar_contacts} active={isActive('/contacts')} onClick={() => navigate('/contacts')} />

      {/* Wallet */}
      <SidebarButton icon="💰" tooltip={t.wallet_title} active={isActive('/wallet')} onClick={() => navigate('/wallet')} />

      {/* Security */}
      <SidebarButton icon="🔒" tooltip={t.security_lock} active={isActive('/security')} onClick={() => navigate('/security')} />

      <div className="flex-1" />

      {/* Settings */}
      <SidebarButton icon="⚙️" tooltip={t.sidebar_settings} active={isActive('/settings')} onClick={() => navigate('/settings')} />

      {/* Profile */}
      <div className="avatar-sm cursor-pointer" title={displayName || ''}>
        {displayName?.[0]?.toUpperCase() || '?'}
      </div>
    </div>
  );
}

function SidebarButton({
  icon,
  tooltip,
  active,
  onClick,
}: {
  icon: string;
  tooltip: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all
        ${active ? 'bg-dark-700 shadow-lg' : 'hover:bg-dark-800'}`}
      title={tooltip}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
