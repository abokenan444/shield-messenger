/**
 * Solana Blockchain Service for Web
 *
 * Connects to Solana mainnet/devnet via JSON-RPC.
 * Handles wallet creation, balance queries, token accounts, and transactions.
 *
 * Key management: Keys are derived from BIP39 seed phrases and kept in memory only.
 * Private keys are NEVER persisted to localStorage or sent over the network.
 *
 * NOTE: bip39 and ed25519-hd-key are loaded lazily (dynamic import) so they
 * don't block app startup or crash the page if Buffer polyfill fails.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';

// Lazy-loaded crypto modules (heavy Node.js deps that need Buffer polyfill)
let _bip39: typeof import('bip39') | null = null;
let _derivePath: typeof import('ed25519-hd-key').derivePath | null = null;

async function loadCryptoDeps() {
  if (!_bip39 || !_derivePath) {
    // Ensure Buffer polyfill is available before loading crypto deps
    if (typeof globalThis.Buffer === 'undefined') {
      const { Buffer } = await import('buffer');
      globalThis.Buffer = Buffer;
    }
    const [bip39Mod, hdKeyMod] = await Promise.all([
      import('bip39'),
      import('ed25519-hd-key'),
    ]);
    _bip39 = bip39Mod;
    _derivePath = hdKeyMod.derivePath;
  }
  return { bip39: _bip39, derivePath: _derivePath };
}

// ── RPC Endpoints ──────────────────────────────────────────────────────

const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC = clusterApiUrl('devnet');

// CoinGecko price endpoint (free, no API key)
const COINGECKO_SOL_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

// SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

// Known token mints → symbols
const KNOWN_MINTS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  So11111111111111111111111111111111111111112: 'SOL',
  'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS': 'ZEC',
  USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB: 'USD1',
  GFJbQ7WDQry73iTaGkJcXKjvi1ViFTFmHSENgz92jFPP: 'SECURE',
};

// ── Types ──────────────────────────────────────────────────────────────

export interface TokenAccount {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
}

export interface TransactionInfo {
  signature: string;
  timestamp: number;
  amount: number;
  type: 'send' | 'receive';
  status: 'success' | 'failed';
  otherPartyAddress: string;
}

// ── Module State (in-memory only) ──────────────────────────────────────

let _connection: Connection | null = null;
let _keypair: Keypair | null = null;
let _mnemonic: string | null = null;
let _useTestnet = false;

// ── Connection ─────────────────────────────────────────────────────────

function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(_useTestnet ? DEVNET_RPC : MAINNET_RPC, 'confirmed');
  }
  return _connection;
}

// ── Wallet Lifecycle ───────────────────────────────────────────────────

/**
 * Generate a new BIP39 mnemonic and derive a Solana keypair.
 * Returns the mnemonic (user must back it up) and the public key.
 */
export async function createWallet(testnet = false): Promise<{
  mnemonic: string;
  publicKey: string;
}> {
  const { bip39, derivePath } = await loadCryptoDeps();

  _useTestnet = testnet;
  _connection = null; // reset connection for new network

  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic);

  // Solana derivation path: m/44'/501'/0'/0'
  const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  _keypair = Keypair.fromSeed(new Uint8Array(derived.key));
  _mnemonic = mnemonic;

  return { mnemonic, publicKey: _keypair.publicKey.toBase58() };
}

/**
 * Import wallet from an existing BIP39 mnemonic.
 */
export async function importWallet(
  mnemonic: string,
  testnet = false,
): Promise<{ publicKey: string }> {
  const { bip39, derivePath } = await loadCryptoDeps();

  if (!bip39.validateMnemonic(mnemonic.trim())) {
    throw new Error('Invalid seed phrase');
  }

  _useTestnet = testnet;
  _connection = null;

  const seed = bip39.mnemonicToSeedSync(mnemonic.trim());
  const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  _keypair = Keypair.fromSeed(new Uint8Array(derived.key));
  _mnemonic = mnemonic.trim();

  return { publicKey: _keypair.publicKey.toBase58() };
}

/**
 * Restore a wallet from a stored encrypted seed (called on page load).
 * If the user had a wallet in a previous session, re-derive the keypair.
 */
export async function restoreWallet(mnemonic: string, testnet = false): Promise<string | null> {
  try {
    const result = await importWallet(mnemonic, testnet);
    return result.publicKey;
  } catch {
    return null;
  }
}

/** Wipe in-memory keys (logout) */
export function clearWallet(): void {
  _keypair = null;
  _mnemonic = null;
}

/** Get the current public key (base58) or null */
export function getPublicKey(): string | null {
  return _keypair?.publicKey.toBase58() ?? null;
}

/** Get the current mnemonic (for backup display). Never persist. */
export function getMnemonic(): string | null {
  return _mnemonic;
}

/** Check whether a wallet is loaded */
export function isWalletReady(): boolean {
  return _keypair !== null;
}

// ── Balance ────────────────────────────────────────────────────────────

/** Get SOL balance for the loaded wallet (or any public key) */
export async function getBalance(publicKey?: string): Promise<number> {
  const conn = getConnection();
  const pk = publicKey
    ? new PublicKey(publicKey)
    : _keypair?.publicKey;

  if (!pk) throw new Error('No wallet loaded');

  const lamports = await conn.getBalance(pk);
  return lamports / LAMPORTS_PER_SOL;
}

// ── SPL Tokens ─────────────────────────────────────────────────────────

/** Get all SPL token accounts with non-zero balance */
export async function getTokenAccounts(
  publicKey?: string,
): Promise<TokenAccount[]> {
  const conn = getConnection();
  const pk = publicKey
    ? new PublicKey(publicKey)
    : _keypair?.publicKey;

  if (!pk) throw new Error('No wallet loaded');

  const response = await conn.getParsedTokenAccountsByOwner(pk, {
    programId: TOKEN_PROGRAM_ID,
  });

  const tokens: TokenAccount[] = [];

  for (const item of response.value) {
    const info = item.account.data.parsed?.info;
    if (!info) continue;

    const mint: string = info.mint;
    const tokenAmount = info.tokenAmount;
    const uiAmount: number = tokenAmount.uiAmount ?? 0;
    const decimals: number = tokenAmount.decimals ?? 0;

    if (uiAmount > 0) {
      tokens.push({
        mint,
        symbol: KNOWN_MINTS[mint] ?? 'Unknown',
        balance: uiAmount,
        decimals,
      });
    }
  }

  return tokens;
}

// ── Transactions ───────────────────────────────────────────────────────

/** Send SOL to a recipient address. Returns the transaction signature. */
export async function sendSOL(
  toAddress: string,
  amountSOL: number,
): Promise<string> {
  if (!_keypair) throw new Error('No wallet loaded');
  if (amountSOL <= 0) throw new Error('Amount must be positive');

  const conn = getConnection();
  const toPubkey = new PublicKey(toAddress);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: _keypair.publicKey,
      toPubkey,
      lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
    }),
  );

  const signature = await sendAndConfirmTransaction(conn, transaction, [_keypair]);
  return signature;
}

/** Get recent transaction history for the current wallet */
export async function getRecentTransactions(
  limit = 10,
): Promise<TransactionInfo[]> {
  if (!_keypair) throw new Error('No wallet loaded');

  const conn = getConnection();
  const walletAddress = _keypair.publicKey.toBase58();

  // Fetch confirmed signatures
  const signatures = await conn.getSignaturesForAddress(
    _keypair.publicKey,
    { limit },
  );

  const transactions: TransactionInfo[] = [];

  for (const sig of signatures) {
    try {
      const tx = await conn.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta || !tx.transaction) continue;

      const accountKeys = tx.transaction.message.accountKeys;
      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;

      // Find wallet's index in accountKeys
      let walletIndex = -1;
      for (let i = 0; i < accountKeys.length; i++) {
        if (accountKeys[i].pubkey.toBase58() === walletAddress) {
          walletIndex = i;
          break;
        }
      }

      if (walletIndex < 0) continue;

      const diff = postBalances[walletIndex] - preBalances[walletIndex];
      const amount = Math.abs(diff) / LAMPORTS_PER_SOL;
      const type: 'send' | 'receive' = diff < 0 ? 'send' : 'receive';

      // Find counterparty
      let otherPartyAddress = '';
      for (let i = 0; i < accountKeys.length; i++) {
        if (i === walletIndex) continue;
        if (preBalances[i] !== postBalances[i]) {
          const addr = accountKeys[i].pubkey.toBase58();
          if (addr !== '11111111111111111111111111111111') {
            otherPartyAddress = addr;
            break;
          }
        }
      }

      transactions.push({
        signature: sig.signature,
        timestamp: (sig.blockTime ?? 0) * 1000,
        amount,
        type,
        status: tx.meta.err ? 'failed' : 'success',
        otherPartyAddress,
      });
    } catch {
      // Skip unparseable transactions
    }
  }

  return transactions;
}

// ── Price ──────────────────────────────────────────────────────────────

/** Fetch SOL price in USD from CoinGecko (free, no key) */
export async function getSolPrice(): Promise<number> {
  const res = await fetch(COINGECKO_SOL_URL);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const json = await res.json();
  return json.solana.usd as number;
}

// ── Fee Estimation ────────────────────────────────────────────────────

/** Estimate the transaction fee in SOL */
export async function getTransactionFee(): Promise<number> {
  // Solana base fee: 5000 lamports per signature
  const baseFee = 5000;
  return baseFee / LAMPORTS_PER_SOL;
}
