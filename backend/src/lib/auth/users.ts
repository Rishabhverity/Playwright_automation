import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { AppUser } from "../types";

const USERS_DIR = path.join(process.cwd(), "data", "users");
const EMAIL_INDEX_PATH = path.join(USERS_DIR, "email-index.json");

interface StoredUser extends AppUser {
  passwordHash: string;
}

async function ensureUsersDir() {
  await fs.mkdir(USERS_DIR, { recursive: true });
}

async function loadEmailIndex(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(EMAIL_INDEX_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveEmailIndex(index: Record<string, string>) {
  await ensureUsersDir();
  await fs.writeFile(EMAIL_INDEX_PATH, JSON.stringify(index, null, 2));
}

function userPath(userId: string) {
  return path.join(USERS_DIR, `${userId}.json`);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AppUser> {
  await ensureUsersDir();

  const email = input.email.trim().toLowerCase();
  const index = await loadEmailIndex();

  if (index[email]) {
    throw new Error("An account with this email already exists.");
  }

  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: new Date().toISOString(),
  };

  await fs.writeFile(userPath(user.id), JSON.stringify(user, null, 2));
  index[email] = user.id;
  await saveEmailIndex(index);

  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<AppUser | null> {
  const index = await loadEmailIndex();
  const userId = index[email.trim().toLowerCase()];
  if (!userId) return null;

  try {
    const raw = await fs.readFile(userPath(userId), "utf-8");
    const user = JSON.parse(raw) as StoredUser;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  } catch {
    return null;
  }
}

export async function getUserById(userId: string): Promise<AppUser | null> {
  try {
    const raw = await fs.readFile(userPath(userId), "utf-8");
    const user = JSON.parse(raw) as StoredUser;
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  } catch {
    return null;
  }
}
