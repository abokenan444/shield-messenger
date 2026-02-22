import { create } from 'zustand';

export interface WalletToken {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  icon: string;
}

export interface WalletTransaction {
  id: string;
  type: 'send' | 'receive' | 'swap';
  token: string;
  amount: number;
  address: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  txHash: string;
}

interface WalletState {
  hasWallet: boolean;
  walletType: 'solana' | 'zcash' | null;
  address: string | null;
  tokens: WalletToken[];
  transactions: WalletTransaction[];
  totalUsdBalance: number;

  createWallet: (type: 'solana' | 'zcash') => void;
  importWallet: (type: 'solana' | 'zcash', seedPhrase: string) => void;
  setTokens: (tokens: WalletToken[]) => void;
  addTransaction: (tx: WalletTransaction) => void;
  setTransactions: (txs: WalletTransaction[]) => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  hasWallet: false,
  walletType: null,
  address: null,
  tokens: [],
  transactions: [],
  totalUsdBalance: 0,

  createWallet: (type) =>
    set({
      hasWallet: true,
      walletType: type,
      address: type === 'solana'
        ? 'So1...Legion' + Math.random().toString(36).slice(2, 8)
        : 'zs1...Legion' + Math.random().toString(36).slice(2, 8),
      tokens: type === 'solana'
        ? [
            { symbol: 'SOL', name: 'Solana', balance: 0, usdValue: 0, icon: '◎' },
            { symbol: 'USDC', name: 'USD Coin', balance: 0, usdValue: 0, icon: '$' },
          ]
        : [
            { symbol: 'ZEC', name: 'Zcash', balance: 0, usdValue: 0, icon: 'Ⓩ' },
          ],
      transactions: [],
      totalUsdBalance: 0,
    }),

  importWallet: (type, _seedPhrase) =>
    set({
      hasWallet: true,
      walletType: type,
      address: type === 'solana'
        ? 'So1...Import' + Math.random().toString(36).slice(2, 8)
        : 'zs1...Import' + Math.random().toString(36).slice(2, 8),
      tokens: type === 'solana'
        ? [
            { symbol: 'SOL', name: 'Solana', balance: 2.45, usdValue: 245.0, icon: '◎' },
            { symbol: 'USDC', name: 'USD Coin', balance: 100, usdValue: 100.0, icon: '$' },
          ]
        : [
            { symbol: 'ZEC', name: 'Zcash', balance: 1.2, usdValue: 36.0, icon: 'Ⓩ' },
          ],
      transactions: [
        {
          id: 'tx-001',
          type: 'receive',
          token: type === 'solana' ? 'SOL' : 'ZEC',
          amount: type === 'solana' ? 2.45 : 1.2,
          address: 'external...addr',
          timestamp: Date.now() - 86400000,
          status: 'confirmed',
          txHash: '0x' + Math.random().toString(16).slice(2, 18),
        },
      ],
      totalUsdBalance: type === 'solana' ? 345.0 : 36.0,
    }),

  setTokens: (tokens) =>
    set(() => ({
      tokens,
      totalUsdBalance: tokens.reduce((sum, t) => sum + t.usdValue, 0),
    })),

  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),

  setTransactions: (txs) => set({ transactions: txs }),
}));
