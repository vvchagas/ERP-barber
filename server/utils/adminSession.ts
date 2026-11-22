import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";

const COOKIE_NAME = "admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.MAGIC_KEY;
  if (!value || value.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET or MAGIC_KEY must contain at least 32 characters");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminSession(event: H3Event, username: string): void {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
  const signature = sign(payload);

  setCookie(event, COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export function isAdminSessionValid(event: H3Event): boolean {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { username?: unknown; expiresAt?: unknown };
    return (
      typeof data.username === "string" &&
      typeof data.expiresAt === "number" &&
      data.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function requireAdminSession(event: H3Event): void {
  if (!isAdminSessionValid(event)) {
    throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
  }
}

export function clearAdminSession(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}
