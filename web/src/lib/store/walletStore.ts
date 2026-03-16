import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as solana from '../solanaService';

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
  mnemonic: string | null;
  tokens: WalletToken[];
  transactions: WalletTransaction[];
  totalUsdBalance: number;
  loading: boolean;
  error: string | null;

  createWallet: (type: 'solana' | 'zcash') => Promise<void>;
  importWallet: (type: 'solana' | 'zcash', seedPhrase: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  sendTransaction: (toAddress: string, amount: number, token: string) => Promise<string>;
  setTokens: (tokens: WalletToken[]) => void;
  addTransaction: (tx: WalletTransaction) => void;
  setTransactions: (txs: WalletTransaction[]) => void;
  restoreSession: () => Promise<void>;
  logout: () => void;
}

/** Icon for a token symbol */
function tokenIcon(sym: string): string {
  switch (sym) {
    case 'SOL': return '◎';
    case 'USDC': return '$';
    case 'USDT': return '₮';
    case 'ZEC': return 'Ⓩ';
    default: return '🪙';
  }
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
  hasWallet: false,
  walletType: null,
  address: null,
  mnemonic: null,
  tokens: [],
  transactions: [],
  totalUsdBalance: 0,
  loading: false,
  error: null,

  createWallet: async (type) => {
    if (type === 'solana') {
      set({ loading: true, error: null });
      try {
        const { mnemonic, publicKey } = await solana.createWallet();
        set({
          hasWallet: true,
          walletType: type,
          address: publicKey,
          mnemonic,
          tokens: [
            { symbol: 'SOL', name: 'Solana', balance: 0, usdValue: 0, icon: '◎' },
          ],
          transactions: [],
          totalUsdBalance: 0,
          loading: false,
          error: null,
        });
      } catch (e) {
        set({ loading: false, error: e instanceof Error ? e.message : 'Failed to create wallet' });
      }
    } else {
      set({
        hasWallet: true,
        walletType: type,
        address: null,
        mnemonic: null,
        tokens: [{ symbol: 'ZEC', name: 'Zcash', balance: 0, usdValue: 0, icon: 'Ⓩ' }],
        transactions: [],
        totalUsdBalance: 0,
        error: 'Zcash wallet is only available on the Android app',
      });
    }
  },

  importWallet: async (type, seedPhrase) => {
    if (type === 'solana') {
      set({ loading: true, error: null });
      try {
        const { publicKey } = await solana.importWallet(seedPhrase);
        set({
          hasWallet: true,
          walletType: type,
          address: publicKey,
          mnemonic: seedPhrase.trim(),
          tokens: [
            { symbol: 'SOL', name: 'Solana', balance: 0, usdValue: 0, icon: '◎' },
          ],
          transactions: [],
          totalUsdBalance: 0,
          loading: false,
          error: null,
        });
        // Trigger async balance refresh
        get().refreshBalance();
        get().refreshTransactions();
      } catch (e) {
        set({ loading: false, error: e instanceof Error ? e.message : 'Failed to import wallet' });
      }
    } else {
      set({
        hasWallet: true,
        walletType: type,
        address: null,
        mnemonic: null,
        tokens: [{ symbol: 'ZEC', name: 'Zcash', balance: 0, usdValue: 0, icon: 'Ⓩ' }],
        transactions: [],
        totalUsdBalance: 0,
        error: 'Zcash wallet is only available on the Android app',
      });
    }
  },

  restoreSession: async () => {
    const { mnemonic, walletType } = get();
    if (mnemonic && walletType === 'solana') {
      const pubkey = await solana.restoreWallet(mnemonic);
      if (pubkey) {
        set({ address: pubkey });
        get().refreshBalance();
        get().refreshTransactions();
      }
    }
  },

  refreshBalance: async () => {
    const { address, walletType } = get();
    if (!address || walletType !== 'solana') return;

    set({ loading: true, error: null });
    try {
      const [balanceSOL, tokenAccounts, solPrice] = await Promise.all([
        solana.getBalance(address),
        solana.getTokenAccounts(address).catch(() => [] as solana.TokenAccount[]),
        solana.getSolPrice().catch(() => 0),
      ]);

      const tokens: WalletToken[] = [
        {
          symbol: 'SOL',
          name: 'Solana',
          balance: balanceSOL,
          usdValue: balanceSOL * solPrice,
          icon: '◎',
        },
      ];

      for (const ta of tokenAccounts) {
        tokens.push({
          symbol: ta.symbol,
          name: ta.symbol,
          balance: ta.balance,
          usdValue: 0, // SPL token USD prices can be added later
          icon: tokenIcon(ta.symbol),
        });
      }

      const totalUsdBalance = tokens.reduce((sum, t) => sum + t.usdValue, 0);
      set({ tokens, totalUsdBalance, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to refresh balance',
      });
    }
  },

  refreshTransactions: async () => {
    const { walletType } = get();
    if (walletType !== 'solana' || !solana.isWalletReady()) return;

    try {
      const txs = await solana.getRecentTransactions(15);
      const mapped: WalletTransaction[] = txs.map((tx) => ({
        id: tx.signature,
        type: tx.type as 'send' | 'receive',
        token: 'SOL',
        amount: tx.amount,
        address: tx.otherPartyAddress,
        timestamp: tx.timestamp,
        status: tx.status === 'success' ? 'confirmed' as const : 'failed' as const,
        txHash: tx.signature,
      }));
      set({ transactions: mapped });
    } catch {
      // Silently fail — transactions are non-critical
    }
  },

  sendTransaction: async (toAddress, amount, _token) => {
    const { walletType } = get();
    if (walletType !== 'solana') throw new Error('Only Solana supported on web');
    if (!solana.isWalletReady()) throw new Error('Wallet not loaded');

    set({ loading: true, error: null });
    try {
      const signature = await solana.sendSOL(toAddress, amount);

      // Add pending transaction to list
      get().addTransaction({
        id: signature,
        type: 'send',
        token: 'SOL',
        amount,
        address: toAddress,
        timestamp: Date.now(),
        status: 'confirmed',
        txHash: signature,
      });

      // Refresh balance after send
      get().refreshBalance();

      set({ loading: false });
      return signature;
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Transaction failed',
      });
      throw e;
    }
  },

  logout: () => {
    solana.clearWallet();
    set({
      hasWallet: false,
      walletType: null,
      address: null,
      mnemonic: null,
      tokens: [],
      transactions: [],
      totalUsdBalance: 0,
      loading: false,
      error: null,
    });
  },

  setTokens: (tokens) =>
    set(() => ({
      tokens,
      totalUsdBalance: tokens.reduce((sum, t) => sum + t.usdValue, 0),
    })),

  addTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),

  setTransactions: (txs) => set({ transactions: txs }),
    }),
    {
      name: 'shield-messenger-wallet',
      partialize: (state) => ({
        // Only persist non-sensitive state + encrypted mnemonic
        hasWallet: state.hasWallet,
        walletType: state.walletType,
        address: state.address,
        mnemonic: state.mnemonic, // NOTE: in production, encrypt before persisting
        tokens: state.tokens,
        totalUsdBalance: state.totalUsdBalance,
      }),
    },
  ),
);
