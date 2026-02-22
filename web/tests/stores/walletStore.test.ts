import { describe, it, expect, beforeEach } from 'vitest';
import { useWalletStore } from '../../src/lib/store/walletStore';

describe('walletStore', () => {
  beforeEach(() => {
    useWalletStore.setState({
      hasWallet: false,
      walletType: null,
      address: null,
      tokens: [],
      transactions: [],
      totalUsdBalance: 0,
    });
  });

  describe('wallet creation', () => {
    it('should start without a wallet', () => {
      expect(useWalletStore.getState().hasWallet).toBe(false);
      expect(useWalletStore.getState().walletType).toBeNull();
    });

    it('should create a Solana wallet', () => {
      useWalletStore.getState().createWallet('solana');
      const state = useWalletStore.getState();
      expect(state.hasWallet).toBe(true);
      expect(state.walletType).toBe('solana');
      expect(state.address).toContain('So1');
      expect(state.tokens.length).toBeGreaterThanOrEqual(1);
      expect(state.tokens[0].symbol).toBe('SOL');
    });

    it('should create a Zcash wallet', () => {
      useWalletStore.getState().createWallet('zcash');
      const state = useWalletStore.getState();
      expect(state.hasWallet).toBe(true);
      expect(state.walletType).toBe('zcash');
      expect(state.address).toContain('zs1');
      expect(state.tokens[0].symbol).toBe('ZEC');
    });
  });

  describe('wallet import', () => {
    it('should import Solana wallet with seed phrase', () => {
      useWalletStore.getState().importWallet('solana', 'seed phrase words');
      const state = useWalletStore.getState();
      expect(state.hasWallet).toBe(true);
      expect(state.walletType).toBe('solana');
      expect(state.tokens[0].balance).toBeGreaterThan(0);
    });

    it('should import Zcash wallet with seed phrase', () => {
      useWalletStore.getState().importWallet('zcash', 'seed phrase words');
      const state = useWalletStore.getState();
      expect(state.hasWallet).toBe(true);
      expect(state.walletType).toBe('zcash');
      expect(state.tokens[0].symbol).toBe('ZEC');
    });
  });

  describe('transactions', () => {
    it('should add a transaction', () => {
      useWalletStore.getState().addTransaction({
        id: 'tx-1',
        type: 'send',
        token: 'SOL',
        amount: 1.5,
        address: 'So1...dest',
        timestamp: Date.now(),
        status: 'pending',
        txHash: '0xabc123',
      });
      expect(useWalletStore.getState().transactions).toHaveLength(1);
    });

    it('should set transactions', () => {
      useWalletStore.getState().setTransactions([
        { id: 'tx-1', type: 'send', token: 'SOL', amount: 1, address: 'a', timestamp: 0, status: 'confirmed', txHash: '0x1' },
        { id: 'tx-2', type: 'receive', token: 'SOL', amount: 2, address: 'b', timestamp: 0, status: 'confirmed', txHash: '0x2' },
      ]);
      expect(useWalletStore.getState().transactions).toHaveLength(2);
    });

    it('should set tokens', () => {
      useWalletStore.getState().setTokens([
        { symbol: 'SOL', name: 'Solana', balance: 10, usdValue: 1000, icon: '◎' },
      ]);
      expect(useWalletStore.getState().tokens).toHaveLength(1);
      expect(useWalletStore.getState().tokens[0].balance).toBe(10);
    });
  });
});
