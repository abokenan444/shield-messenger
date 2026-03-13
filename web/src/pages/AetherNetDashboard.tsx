import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
interface TransportStatus {
  name: string;
  type: 'tor' | 'i2p' | 'mesh';
  available: boolean;
  icon: string;
  latency?: string;
  description: string;
}

interface AetherNetState {
  torAvailable: boolean;
  i2pAvailable: boolean;
  meshAvailable: boolean;
  crisisActive: boolean;
  threatLevel: string;
  pendingMessages: number;
  meshPeers: number;
  meshClusters: number;
  solidarityEnabled: boolean;
  trustPeers: number;
  activeTransport: string;
}

const DEFAULT_STATE: AetherNetState = {
  torAvailable: true,
  i2pAvailable: false,
  meshAvailable: false,
  crisisActive: false,
  threatLevel: 'Normal',
  pendingMessages: 0,
  meshPeers: 0,
  meshClusters: 0,
  solidarityEnabled: false,
  trustPeers: 0,
  activeTransport: 'Tor',
};

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        active ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-dark-600'
      }`}
    />
  );
}

function TransportCard({ transport }: { transport: TransportStatus }) {
  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-300 ${
        transport.available
          ? 'border-primary-700/50 bg-dark-900/80 shadow-lg shadow-primary-900/10'
          : 'border-dark-800 bg-dark-900/40 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{transport.icon}</span>
          <div>
            <h3 className="font-semibold text-white">{transport.name}</h3>
            <p className="text-xs text-dark-400">{transport.description}</p>
          </div>
        </div>
        <StatusDot active={transport.available} />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            transport.available
              ? 'bg-green-900/30 text-green-400'
              : 'bg-dark-800 text-dark-500'
          }`}
        >
          {transport.available ? 'Connected' : 'Offline'}
        </span>
        {transport.latency && (
          <span className="text-xs text-dark-400">{transport.latency}</span>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color = 'primary',
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary-400 bg-primary-900/20',
    green: 'text-green-400 bg-green-900/20',
    amber: 'text-amber-400 bg-amber-900/20',
    red: 'text-red-400 bg-red-900/20',
    purple: 'text-purple-400 bg-purple-900/20',
  };

  return (
    <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-lg p-1.5 rounded-lg ${colorClasses[color] || colorClasses.primary}`}>
          {icon}
        </span>
        <span className="text-xs text-dark-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export function AetherNetDashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState<AetherNetState>(DEFAULT_STATE);
  const [crisisToggling, setCrisisToggling] = useState(false);
  const [solidarityToggling, setSolidarityToggling] = useState(false);

  const refreshStatus = useCallback(() => {
    // In production, this would call the WASM bridge or a WebSocket API
    // For now, simulate with the current state
    setState((prev) => ({ ...prev }));
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30_000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const transports: TransportStatus[] = [
    {
      name: 'Tor',
      type: 'tor',
      available: state.torAvailable,
      icon: '🧅',
      latency: state.torAvailable ? '~800ms' : undefined,
      description: 'Anonymous routing via Tor onion network (Arti)',
    },
    {
      name: 'I2P',
      type: 'i2p',
      available: state.i2pAvailable,
      icon: '🧄',
      latency: state.i2pAvailable ? '~1200ms' : undefined,
      description: 'Garlic routing via I2P (SAM v3.1)',
    },
    {
      name: 'Mesh',
      type: 'mesh',
      available: state.meshAvailable,
      icon: '📡',
      latency: state.meshAvailable ? '~50ms' : undefined,
      description: 'Local mesh via BLE / Wi-Fi Direct / LoRa',
    },
  ];

  const threatColors: Record<string, string> = {
    Normal: 'text-green-400',
    Elevated: 'text-amber-400',
    High: 'text-orange-400',
    Critical: 'text-red-400',
  };

  const handleCrisisToggle = async () => {
    setCrisisToggling(true);
    await new Promise((r) => setTimeout(r, 500));
    setState((prev) => ({
      ...prev,
      crisisActive: !prev.crisisActive,
      threatLevel: prev.crisisActive ? 'Normal' : 'Elevated',
    }));
    setCrisisToggling(false);
  };

  const handleSolidarityToggle = async () => {
    setSolidarityToggling(true);
    await new Promise((r) => setTimeout(r, 500));
    setState((prev) => ({
      ...prev,
      solidarityEnabled: !prev.solidarityEnabled,
    }));
    setSolidarityToggling(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-16 md:pb-0">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800 px-4 md:px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-dark-400 hover:text-dark-200 transition"
        >
          ←
        </button>
        <span className="text-xl">🌐</span>
        <h1 className="text-xl font-semibold">AetherNet</h1>
        <span className="ml-auto text-xs text-dark-500">Multi-Transport Mesh</span>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Active transport + threat level banner */}
        <div
          className={`rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            state.crisisActive
              ? 'border-red-800/60 bg-red-950/30'
              : 'border-dark-800 bg-dark-900/60'
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-dark-400">Active Transport:</span>
              <span className="text-sm font-semibold text-primary-400">
                {state.activeTransport}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">Threat Level:</span>
              <span
                className={`text-sm font-semibold ${
                  threatColors[state.threatLevel] || 'text-dark-300'
                }`}
              >
                {state.threatLevel}
              </span>
            </div>
          </div>
          {state.crisisActive && (
            <div className="flex items-center gap-2 text-red-400 animate-pulse">
              <span>⚠️</span>
              <span className="text-sm font-semibold">CRISIS MODE ACTIVE</span>
            </div>
          )}
        </div>

        {/* Transport cards */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Transports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {transports.map((t) => (
              <TransportCard key={t.type} transport={t} />
            ))}
          </div>
        </div>

        {/* Metrics grid */}
        <div>
          <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">
            Network Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Mesh Peers" value={state.meshPeers} icon="👥" color="primary" />
            <MetricCard label="Clusters" value={state.meshClusters} icon="🔗" color="purple" />
            <MetricCard label="Pending" value={state.pendingMessages} icon="📤" color="amber" />
            <MetricCard label="Trust Peers" value={state.trustPeers} icon="🤝" color="green" />
          </div>
        </div>

        {/* Smart Switching Visualization */}
        <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-5">
          <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
            Smart Switching Engine
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Anonymity', weight: 0.35, color: 'bg-purple-500' },
              { label: 'Latency', weight: 0.25, color: 'bg-blue-500' },
              { label: 'Reliability', weight: 0.2, color: 'bg-green-500' },
              { label: 'Bandwidth', weight: 0.1, color: 'bg-amber-500' },
              { label: 'Battery', weight: 0.05, color: 'bg-orange-500' },
              { label: 'Threat', weight: 0.05, color: 'bg-red-500' },
            ].map((factor) => (
              <div key={factor.label} className="flex items-center gap-3">
                <span className="text-xs text-dark-400 w-20">{factor.label}</span>
                <div className="flex-1 h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${factor.color} rounded-full transition-all duration-700`}
                    style={{ width: `${factor.weight * 100}%` }}
                  />
                </div>
                <span className="text-xs text-dark-500 w-10 text-right">
                  {(factor.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Crisis Mode */}
          <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span>🚨</span> Crisis Mode
                </h3>
                <p className="text-xs text-dark-400 mt-1">
                  Activates redundant delivery, identity rotation, and traffic padding
                </p>
              </div>
              <button
                onClick={handleCrisisToggle}
                disabled={crisisToggling}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  state.crisisActive ? 'bg-red-500' : 'bg-dark-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    state.crisisActive ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {state.crisisActive && (
              <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/30">
                <ul className="text-xs text-red-300 space-y-1">
                  <li>• All identities rotated</li>
                  <li>• Sending via all available transports</li>
                  <li>• Traffic padding enabled</li>
                  <li>• Dummy messages generated</li>
                </ul>
              </div>
            )}
          </div>

          {/* Solidarity Relay */}
          <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span>🤲</span> Solidarity Relay
                </h3>
                <p className="text-xs text-dark-400 mt-1">
                  Donate bandwidth to relay messages for others (onion-encrypted)
                </p>
              </div>
              <button
                onClick={handleSolidarityToggle}
                disabled={solidarityToggling}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                  state.solidarityEnabled ? 'bg-primary-500' : 'bg-dark-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 ${
                    state.solidarityEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {state.solidarityEnabled && (
              <div className="mt-3 p-3 rounded-lg bg-primary-950/40 border border-primary-800/30">
                <div className="flex justify-between text-xs text-primary-300">
                  <span>Daily limit: 50 MB</span>
                  <span>Relayed: 0 MB</span>
                </div>
                <div className="mt-2 h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full w-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Protocol Stack */}
        <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-5">
          <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
            Protocol Stack
          </h2>
          <div className="space-y-1 font-mono text-xs">
            {[
              { layer: 'Application', desc: 'Shield Messenger UI/UX', color: 'text-primary-400' },
              { layer: 'Crypto', desc: 'ML-KEM + X25519 + Ed25519', color: 'text-green-400' },
              { layer: 'Abstraction', desc: 'Smart Switcher + Store-Forward', color: 'text-amber-400' },
              { layer: 'Transport', desc: 'Tor (Arti) | I2P (SAM) | Mesh (BLE/WiFi/LoRa)', color: 'text-purple-400' },
              { layer: 'Trust', desc: 'Trust Map + Crowd Mesh + Solidarity', color: 'text-blue-400' },
            ].map((item, i) => (
              <div
                key={item.layer}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-dark-800/40"
              >
                <span className="text-dark-500 w-4 text-right">{i + 1}</span>
                <span className={`w-28 ${item.color}`}>{item.layer}</span>
                <span className="text-dark-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Store & Forward Queue */}
        {state.pendingMessages > 0 && (
          <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5">
            <h2 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Store & Forward Queue
            </h2>
            <p className="text-sm text-dark-400">
              {state.pendingMessages} message{state.pendingMessages !== 1 ? 's' : ''} queued for
              delivery. These will be automatically delivered when a transport becomes available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
