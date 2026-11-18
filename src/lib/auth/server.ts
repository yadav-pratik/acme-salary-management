import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type AuthConfig, verifySessionToken } from "./session";

export const SESSION_COOKIE = "acme-hr-session";

export function getAuthConfig(): AuthConfig | null {
  const username = process.env.DEMO_USERNAME;
  const password = process.env.DEMO_PASSWORD;
  const secret = process.env.SESSION_SECRET;

  if (!username || !password || !secret || secret.length < 32) {
    return null;
  }

  return { username, password, secret };
}

export async function isAuthenticated() {
  const config = getAuthConfig();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(config && token && await verifySessionToken(token, config));
}

export async function requireAuth() {
  if (!await isAuthenticated()) {
    redirect("/login");
  }
}
