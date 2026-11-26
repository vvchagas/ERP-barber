import { createHmac, timingSafeEqual } from "node:crypto";
import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";
import { prisma } from "./prisma";

const COOKIE_NAME = "admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminSession(event: H3Event, customerId: string, username: string): void {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ customerId, username, expiresAt })).toString("base64url");
  const signature = sign(payload);

  setCookie(event, COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

function getAdminSessionClaims(event: H3Event): { customerId: string; username: string } | null {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { customerId?: unknown; username?: unknown; expiresAt?: unknown };
    if (
      typeof data.customerId !== "string" ||
      typeof data.username !== "string" ||
      typeof data.expiresAt !== "number" ||
      data.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null;
    return { customerId: data.customerId, username: data.username };
  } catch {
    return null;
  }
}

export async function isAdminSessionValid(event: H3Event): Promise<boolean> {
  const claims = getAdminSessionClaims(event);
  if (!claims) return false;
  const customer = await prisma.customer.findUnique({
    where: { id: claims.customerId },
    select: { role: true, email: true },
  });
  return customer?.role === "ADMIN";
}

export async function requireAdminSession(event: H3Event): Promise<void> {
  const claims = getAdminSessionClaims(event);
  if (!claims) {
    throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
  }
  const customer = await prisma.customer.findUnique({
    where: { id: claims.customerId },
    select: { role: true },
  });
  if (customer?.role !== "ADMIN") {
    clearAdminSession(event);
    throw createError({ statusCode: 404, statusMessage: "Página não encontrada" });
  }
}

export function clearAdminSession(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}

const CUSTOMER_COOKIE_NAME = "customer_session";
const CUSTOMER_SESSION_SECONDS = 60 * 60 * 24 * 7;

export function createCustomerSession(event: H3Event, phone: string): void {
  const expiresAt = Math.floor(Date.now() / 1000) + CUSTOMER_SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ phone, expiresAt })).toString("base64url");
  const signature = sign(payload);
  setCookie(event, CUSTOMER_COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SESSION_SECONDS,
  });
}

export function isCustomerSessionValid(event: H3Event): boolean {
  const token = getCookie(event, CUSTOMER_COOKIE_NAME);
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      phone?: unknown;
      expiresAt?: unknown;
    };
    return typeof data.phone === "string"
      && typeof data.expiresAt === "number"
      && data.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getCustomerSessionPhone(event: H3Event): string | null {
  if (!isCustomerSessionValid(event)) return null;
  const token = getCookie(event, CUSTOMER_COOKIE_NAME);
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  try {
    const data = JSON.parse(
      Buffer.from(token.slice(0, separator), "base64url").toString("utf8"),
    ) as { phone?: unknown };
    return typeof data.phone === "string" ? data.phone : null;
  } catch {
    return null;
  }
}

export function clearCustomerSession(event: H3Event): void {
  deleteCookie(event, CUSTOMER_COOKIE_NAME, { path: "/" });
}
