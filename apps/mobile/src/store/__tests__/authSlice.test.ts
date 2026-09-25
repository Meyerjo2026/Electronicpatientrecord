/**
 * The demo login is a development convenience. These tests pin down that it
 * cannot be reached in a release build, which is the property that keeps a
 * shipped app from handing out document-signing rights.
 */
describe('demo auth gating', () => {
  it('opens the demo path only when __DEV__ is explicitly true', () => {
    jest.resetModules();
    (global as { __DEV__?: boolean }).__DEV__ = true;
    try {
      const { DEMO_AUTH_ENABLED } = require('../authSlice');
      expect(DEMO_AUTH_ENABLED).toBe(true);
    } finally {
      delete (global as { __DEV__?: boolean }).__DEV__;
      jest.resetModules();
    }
  });

  it('defaults to closed when __DEV__ is absent, as under jest', () => {
    jest.resetModules();
    delete (global as { __DEV__?: boolean }).__DEV__;
    try {
      const { DEMO_AUTH_ENABLED } = require('../authSlice');
      expect(DEMO_AUTH_ENABLED).toBe(false);
    } finally {
      jest.resetModules();
    }
  });

  it('closes the demo path when __DEV__ is false', () => {
    jest.resetModules();
    (global as { __DEV__?: boolean }).__DEV__ = false;
    try {
      const { DEMO_AUTH_ENABLED, AUTH_UNAVAILABLE } = require('../authSlice');
      expect(DEMO_AUTH_ENABLED).toBe(false);
      expect(AUTH_UNAVAILABLE).toMatch(/not available/i);
    } finally {
      (global as { __DEV__?: boolean }).__DEV__ = true;
      jest.resetModules();
    }
  });

  it('treats a missing __DEV__ as a release build', () => {
    jest.resetModules();
    delete (global as { __DEV__?: boolean }).__DEV__;
    try {
      const { DEMO_AUTH_ENABLED } = require('../authSlice');
      expect(DEMO_AUTH_ENABLED).toBe(false);
    } finally {
      (global as { __DEV__?: boolean }).__DEV__ = true;
      jest.resetModules();
    }
  });
});

describe('isSessionValid', () => {
  const session = (expiresAt: string) => ({
    id: 'a',
    userId: 'u',
    deviceId: 'd',
    roles: [],
    permissions: [],
    issuedAt: new Date().toISOString(),
    expiresAt,
    lastActivity: new Date().toISOString(),
  });

  it('accepts an unexpired session', () => {
    const { isSessionValid } = require('../authSlice');
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isSessionValid(session(future))).toBe(true);
  });

  it('rejects an expired session', () => {
    const { isSessionValid } = require('../authSlice');
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isSessionValid(session(past))).toBe(false);
  });

  it('rejects a session with an unreadable expiry', () => {
    const { isSessionValid } = require('../authSlice');
    expect(isSessionValid(session('not-a-date'))).toBe(false);
  });

  it('rejects a missing session', () => {
    const { isSessionValid } = require('../authSlice');
    expect(isSessionValid(null)).toBe(false);
  });
});
