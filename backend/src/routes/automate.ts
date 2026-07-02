import { Router } from "express";
import { getUserFromRequest } from "../lib/auth/session";
import { runLoginAutomation } from "../lib/loginAutomation";
import { createSessionId } from "../lib/sessionStorage";
import { hostnameFromUrl, labelFromHostname } from "../lib/siteUtils";
import { runTaskAutomation } from "../lib/taskAutomation";
import type { TaskType } from "../lib/types";

const router = Router();

router.post("/automate-login", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Sign in to save sessions.",
        screenshot: "",
      });
      return;
    }

    const { url, username, email, password } = req.body;

    if (!url || !password) {
      res.json({
        success: false,
        message: "URL and password are required.",
        screenshot: "",
      });
      return;
    }

    if (!username?.trim() && !email?.trim()) {
      res.json({
        success: false,
        message: "Username or email is required.",
        screenshot: "",
      });
      return;
    }

    const targetUrl = url.startsWith("http") ? url : `https://${url}`;
    const siteHostname = hostnameFromUrl(targetUrl);
    const siteLabel = labelFromHostname(siteHostname);
    const sessionId = createSessionId();

    const result = await runLoginAutomation({
      url: targetUrl,
      username,
      email,
      password,
      sessionId,
      userId: user.id,
      siteHostname,
      siteLabel,
      persistSession: true,
    });

    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    res.json({
      success: false,
      message,
      screenshot: "",
    });
  }
});

router.post("/automate-task", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Sign in to run tasks.",
        screenshot: "",
      });
      return;
    }

    const { sessionId, task, query } = req.body;

    if (!sessionId) {
      res.json({
        success: false,
        message: "Pick a saved session to run this task.",
        screenshot: "",
      });
      return;
    }

    const result = await runTaskAutomation({
      sessionId,
      userId: user.id,
      task: (task as TaskType) ?? "search",
      query: query ?? "",
    });

    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    res.json({
      success: false,
      message,
      screenshot: "",
    });
  }
});

export default router;
