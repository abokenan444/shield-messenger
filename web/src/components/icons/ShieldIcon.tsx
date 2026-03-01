interface ShieldIconProps {
  className?: string;
}

export function ShieldIcon({ className = 'w-6 h-6' }: ShieldIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {/* Outer shield */}
      <path
        d="M12 2 L3 6 L3 12.5 C3 18.3 6.8 23.2 12 24.5 C17.2 23.2 21 18.3 21 12.5 L21 6 Z"
        fill="#22c55e"
        opacity="0.15"
        stroke="currentColor"
        strokeWidth="0.5"
      />
      {/* Inner shield */}
      <path
        d="M12 4 L5 7.5 L5 12.5 C5 17 8 21 12 22.2 C16 21 19 17 19 12.5 L19 7.5 Z"
        fill="currentColor"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      {/* Letter S */}
      <path
        d="M10.2 11 C10.2 10 9.3 9.5 8 9.5 C6.7 9.5 5.8 10 5.8 11 C5.8 13 10.2 12.5 10.2 14.5 C10.2 15.5 9.3 16 8 16 C6.7 16 5.8 15.5 5.8 14.5"
        stroke="#22c55e"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Letter M */}
      <path
        d="M12.5 16 L12.5 9.5 L14.8 13 L17.1 9.5 L17.1 16"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M9 18.5 L10.5 20 L14 16.5"
        stroke="#22c55e"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
