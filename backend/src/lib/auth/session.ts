import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import type { AppUser } from "../types";
import { AUTH_COOKIE, getAuthSecret } from "./constants";
import { getUserById } from "./users";

const TOKEN_TTL = "7d";

function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function createAuthToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE);
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[AUTH_COOKIE];
}

export async function getUserFromRequest(req: Request): Promise<AppUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  const userId = await verifyAuthToken(token);
  if (!userId) return null;

  return getUserById(userId);
}
