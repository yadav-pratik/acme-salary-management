"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig, SESSION_COOKIE } from "@/lib/auth/server";
import {
  createSessionToken,
  credentialsMatch,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth/session";

export type LoginState = { error: string };

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username");
  const password = formData.get("password");

  if (typeof username !== "string" || typeof password !== "string"
    || !username || !password || username.length > 256 || password.length > 1024) {
    return { error: "Enter your username and password." };
  }

  const config = getAuthConfig();
  if (!config) {
    return { error: "Sign in is not configured. Please contact the demo owner." };
  }

  if (!credentialsMatch(username, password, config)) {
    return { error: "Invalid username or password." };
  }

  const token = await createSessionToken(config);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  redirect("/employees");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
