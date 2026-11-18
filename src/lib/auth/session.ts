import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export type AuthConfig = {
  username: string;
  password: string;
  secret: string;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function credentialsMatch(username: string, password: string, config: AuthConfig) {
  const usernameMatches = timingSafeEqual(digest(username), digest(config.username));
  const passwordMatches = timingSafeEqual(digest(password), digest(config.password));
  return usernameMatches && passwordMatches;
}

function credentialVersion(config: AuthConfig) {
  return createHmac("sha256", config.secret)
    .update(JSON.stringify([config.username, config.password]))
    .digest("base64url");
}

export async function createSessionToken(config: AuthConfig) {
  return new SignJWT({ credentialVersion: credentialVersion(config) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(config.username)
    .setIssuer("acme-salary-management")
    .setAudience("hr")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(new TextEncoder().encode(config.secret));
}

export async function verifySessionToken(token: string, config: AuthConfig) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.secret), {
      algorithms: ["HS256"],
      issuer: "acme-salary-management",
      audience: "hr",
    });
    return payload.sub === config.username
      && payload.credentialVersion === credentialVersion(config)
      && typeof payload.exp === "number";
  } catch {
    return false;
  }
}
