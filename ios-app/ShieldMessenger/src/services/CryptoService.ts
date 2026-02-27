/**
 * CryptoService — High-level cryptographic operations for Shield Messenger iOS.
 *
 * All actual crypto is delegated to the Rust core via RustBridge.
 * This service provides a clean async API for the UI layer.
 */

import RustBridge, {Keypair, EncryptedMessage, SafetyNumber} from '../native/RustBridge';

class CryptoService {
  private identityKeypair: Keypair | null = null;
  private x25519Keypair: Keypair | null = null;

  /**
   * Initialize crypto subsystem and generate identity if needed.
   */
  async initialize(): Promise<void> {
    await RustBridge.init();
    console.log('[CryptoService] Initialized');
  }

  /**
   * Generate or retrieve the user's Ed25519 identity keypair.
   */
  async getIdentityKeypair(): Promise<Keypair> {
    if (!this.identityKeypair) {
      // TODO: Load from secure storage (Keychain) first
      this.identityKeypair = await RustBridge.generateIdentityKeypair();
    }
    return this.identityKeypair;
  }

  /**
   * Generate a new X25519 ephemeral keypair for key exchange.
   */
  async generateEphemeralKeypair(): Promise<Keypair> {
    return RustBridge.generateX25519Keypair();
  }

  /**
   * Perform X25519 Diffie-Hellman key exchange.
   */
  async deriveSharedSecret(
    ourPrivateKey: string,
    theirPublicKey: string,
  ): Promise<string> {
    return RustBridge.deriveSharedSecret(ourPrivateKey, theirPublicKey);
  }

  /**
   * Encrypt a message using the shared key.
   */
  async encryptMessage(plaintext: string, key: string): Promise<EncryptedMessage> {
    return RustBridge.encrypt(plaintext, key);
  }

  /**
   * Decrypt a message using the shared key.
   */
  async decryptMessage(
    ciphertext: string,
    nonce: string,
    key: string,
  ): Promise<string> {
    return RustBridge.decrypt(ciphertext, nonce, key);
  }

  /**
   * Sign data with our identity private key.
   */
  async sign(data: string): Promise<string> {
    const keypair = await this.getIdentityKeypair();
    return RustBridge.sign(data, keypair.privateKey);
  }

  /**
   * Verify a signature against a public key.
   */
  async verify(
    data: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    return RustBridge.verify(data, signature, publicKey);
  }

  /**
   * Hash a password using Argon2id (via Rust core).
   */
  async hashPassword(password: string): Promise<string> {
    return RustBridge.hashPassword(password);
  }

  /**
   * Verify a password against a stored hash.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return RustBridge.verifyPassword(password, hash);
  }

  /**
   * Generate a safety number for contact verification.
   */
  async generateSafetyNumber(
    theirPublicKey: string,
  ): Promise<SafetyNumber> {
    const ourKeypair = await this.getIdentityKeypair();
    return RustBridge.generateSafetyNumber(ourKeypair.publicKey, theirPublicKey);
  }

  /**
   * Verify a safety number matches expected keys.
   */
  async verifySafetyNumber(
    theirPublicKey: string,
    safetyNumber: string,
  ): Promise<boolean> {
    const ourKeypair = await this.getIdentityKeypair();
    return RustBridge.verifySafetyNumber(
      ourKeypair.publicKey,
      theirPublicKey,
      safetyNumber,
    );
  }

  /**
   * Evolve the Double Ratchet chain key.
   */
  async evolveChainKey(chainKey: string): Promise<string> {
    return RustBridge.evolveChainKey(chainKey);
  }

  /**
   * Derive root key from shared secret.
   */
  async deriveRootKey(sharedSecret: string, info: string): Promise<string> {
    return RustBridge.deriveRootKey(sharedSecret, info);
  }

  /**
   * Clear all in-memory keys (called on lock/duress).
   */
  clearKeys(): void {
    this.identityKeypair = null;
    this.x25519Keypair = null;
    console.log('[CryptoService] Keys cleared from memory');
  }
}

// Singleton
export const cryptoService = new CryptoService();
export default cryptoService;
