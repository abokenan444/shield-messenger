import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store/authStore';
import { ShieldIcon } from './icons/ShieldIcon';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const { displayName } = useAuthStore();

  if (!isOpen) return null;

  return (
    <div className="w-16 bg-dark-900 border-l border-dark-800 flex flex-col items-center py-4 gap-2">
      {/* Logo */}
      <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
        <ShieldIcon className="w-6 h-6 text-white" />
      </div>

      {/* Chat */}
      <SidebarButton icon="💬" tooltip="المحادثات" active onClick={() => navigate('/')} />

      {/* Calls */}
      <SidebarButton icon="📞" tooltip="المكالمات" />

      {/* Contacts */}
      <SidebarButton icon="👥" tooltip="جهات الاتصال" />

      <div className="flex-1" />

      {/* Settings */}
      <SidebarButton icon="⚙️" tooltip="الإعدادات" onClick={() => navigate('/settings')} />

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
