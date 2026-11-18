import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  credentialsMatch,
  SESSION_DURATION_SECONDS,
  verifySessionToken,
} from "./session";

const config = {
  username: "hr",
  password: "test-password",
  secret: "test-session-secret-with-at-least-32-characters",
};

describe("HR demo authentication", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("accepts the configured credentials and rejects wrong or missing values", () => {
    expect(credentialsMatch("hr", "test-password", config)).toBe(true);
    expect(credentialsMatch("another-user", "test-password", config)).toBe(false);
    expect(credentialsMatch("hr", "wrong-password", config)).toBe(false);
    expect(credentialsMatch("", "", config)).toBe(false);
  });

  it("accepts a signed session until its expiration boundary", async () => {
    const token = await createSessionToken(config);
    expect(await verifySessionToken(token, config)).toBe(true);

    vi.advanceTimersByTime((SESSION_DURATION_SECONDS - 1) * 1000);
    expect(await verifySessionToken(token, config)).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(await verifySessionToken(token, config)).toBe(false);
  });

  it("rejects tampered and malformed session tokens", async () => {
    const token = await createSessionToken(config);
    const [header, payload, signature] = token.split(".");
    const changedSignature = (signature[0] === "a" ? "b" : "a") + signature.slice(1);
    expect(await verifySessionToken(`${header}.${payload}.${changedSignature}`, config)).toBe(false);
    expect(await verifySessionToken("invalid-token", config)).toBe(false);
    expect(await verifySessionToken("", config)).toBe(false);
  });

  it("invalidates sessions when configured credentials or secret change", async () => {
    const token = await createSessionToken(config);
    expect(await verifySessionToken(token, { ...config, username: "new-hr" })).toBe(false);
    expect(await verifySessionToken(token, { ...config, password: "new-password" })).toBe(false);
    expect(await verifySessionToken(token, { ...config, secret: "a-different-secret-with-at-least-32-characters" })).toBe(false);
  });
});
