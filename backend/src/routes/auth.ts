import { Router } from "express";
import {
  clearAuthCookie,
  createAuthToken,
  getUserFromRequest,
  setAuthCookie,
} from "../lib/auth/session";
import { createUser, verifyUserCredentials } from "../lib/auth/users";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: "Name, email, and password are required." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    const token = await createAuthToken(user.id);
    setAuthCookie(res, token);
    res.json({ user, token });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create account.";
    res.status(400).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await verifyUserCredentials(email.trim(), password);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = await createAuthToken(user.id);
    setAuthCookie(res, token);
    res.json({ user, token });
  } catch {
    res.status(500).json({ error: "Could not sign in. Please try again." });
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ user: null });
    return;
  }
  res.json({ user });
});

export default router;
