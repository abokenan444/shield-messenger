import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/lib/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      isAuthenticated: false,
      userId: null,
      displayName: null,
      publicKey: null,
    });
  });

  it('should have initial unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.displayName).toBeNull();
    expect(state.publicKey).toBeNull();
  });

  it('should set authenticated state on login', () => {
    useAuthStore.getState().login('user-123', 'Alice', 'ed25519:abc');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.userId).toBe('user-123');
    expect(state.displayName).toBe('Alice');
    expect(state.publicKey).toBe('ed25519:abc');
  });

  it('should clear state on logout', () => {
    useAuthStore.getState().login('user-123', 'Alice', 'ed25519:abc');
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.displayName).toBeNull();
    expect(state.publicKey).toBeNull();
  });

  it('should allow multiple login/logout cycles', () => {
    const { login, logout } = useAuthStore.getState();
    login('user1', 'Alice', 'key1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    login('user2', 'Bob', 'key2');
    expect(useAuthStore.getState().userId).toBe('user2');
    expect(useAuthStore.getState().displayName).toBe('Bob');
  });

  it('should overwrite previous user on new login', () => {
    useAuthStore.getState().login('user1', 'Alice', 'key1');
    useAuthStore.getState().login('user2', 'Bob', 'key2');
    const state = useAuthStore.getState();
    expect(state.userId).toBe('user2');
    expect(state.displayName).toBe('Bob');
    expect(state.publicKey).toBe('key2');
  });
});
