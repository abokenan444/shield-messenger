/**
 * useTorStatus — React hook for observing Tor connection state.
 *
 * Usage:
 *   const { state, status, connect, disconnect, newIdentity } = useTorStatus();
 */

import {useState, useEffect, useCallback} from 'react';
import torService, {TorConnectionState} from '../services/TorService';
import {TorStatus} from '../native/RustBridge';

interface UseTorStatusReturn {
  state: TorConnectionState;
  status: TorStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  newIdentity: () => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
}

export function useTorStatus(): UseTorStatusReturn {
  const [state, setState] = useState<TorConnectionState>(torService.getState());
  const [status, setStatus] = useState<TorStatus>(torService.getStatus());

  useEffect(() => {
    const unsubscribe = torService.subscribe((newState, newStatus) => {
      setState(newState);
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const connect = useCallback(() => torService.connect(), []);
  const disconnect = useCallback(() => torService.disconnect(), []);
  const newIdentity = useCallback(() => torService.newIdentity(), []);

  return {
    state,
    status,
    connect,
    disconnect,
    newIdentity,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
  };
}

export default useTorStatus;
