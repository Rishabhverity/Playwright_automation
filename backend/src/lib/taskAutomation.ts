import type { Browser, BrowserContext } from "playwright";
import {
  createAutomationContext,
  focusAutomationWindow,
  launchAutomationBrowser,
} from "./browser";
import { retainAutomationSession } from "./browserRegistry";
import { runLoginAutomation } from "./loginAutomation";
import {
  getSiteHomeUrl,
  isSiteLoggedIn,
  runSiteTask,
} from "./sites/index";
import {
  loadSessionCredentials,
  loadSessionMeta,
  saveSession,
  sessionBelongsToUser,
  sessionExists,
  storageStatePath,
} from "./sessionStorage";
import type { TaskInput, TaskResult } from "./types";

async function takeScreenshot(page: import("playwright").Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false });
  return buffer.toString("base64");
}

async function refreshSiteSession(sessionId: string, userId: string): Promise<boolean> {
  const creds = await loadSessionCredentials(sessionId);
  const meta = await loadSessionMeta(sessionId);
  const identifier = creds.email || creds.username;

  if (!identifier || meta.userId !== userId) {
    return false;
  }

  const loginResult = await runLoginAutomation({
    url: creds.url,
    email: creds.email,
    username: creds.username,
    password: creds.password,
    sessionId,
    userId,
    siteHostname: meta.siteHostname,
    siteLabel: meta.siteLabel,
    persistSession: true,
    closeAfterSave: true,
  });

  return loginResult.success;
}

export async function runTaskAutomation(input: TaskInput): Promise<TaskResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let closeBrowser = true;

  try {
    const { sessionId, userId, task, query } = input;

    if (!query.trim()) {
      return {
        success: false,
        message: "Task query is required.",
        screenshot: "",
      };
    }

    const ownsSession = await sessionBelongsToUser(sessionId, userId);
    if (!ownsSession) {
      return {
        success: false,
        message: "Session not found or does not belong to your account.",
        screenshot: "",
      };
    }

    const hasSession = await sessionExists(sessionId);
    if (!hasSession) {
      return {
        success: false,
        message: "No saved browser session found. Automate a login first.",
        screenshot: "",
      };
    }

    const meta = await loadSessionMeta(sessionId);
    const creds = await loadSessionCredentials(sessionId);
    const homeUrl = await getSiteHomeUrl(meta.siteHostname, creds.url);

    browser = await launchAutomationBrowser();
    context = await createAutomationContext(browser, storageStatePath(sessionId));
    let page = await context.newPage();
    page.setDefaultTimeout(20_000);

    await page.goto(homeUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });

    let loggedIn = await isSiteLoggedIn(page, meta.siteHostname, creds.url);

    if (!loggedIn) {
      await context.close().catch(() => null);
      await browser.close();
      browser = null;

      const refreshed = await refreshSiteSession(sessionId, userId);

      if (!refreshed) {
        return {
          success: false,
          message: "Session expired and re-login failed. Please automate login again.",
          screenshot: "",
        };
      }

      browser = await launchAutomationBrowser();
      context = await createAutomationContext(browser, storageStatePath(sessionId));
      page = await context.newPage();
      page.setDefaultTimeout(20_000);

      await page.goto(homeUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });

      loggedIn = await isSiteLoggedIn(page, meta.siteHostname, creds.url);
      if (!loggedIn) {
        return {
          success: false,
          message: `Could not restore your ${meta.siteLabel} session after re-login.`,
          screenshot: await takeScreenshot(page),
        };
      }
    }

    await runSiteTask(page, meta.siteHostname, task, query.trim(), creds.url);

    const storageState = await context.storageState();

    await saveSession({
      sessionId,
      userId,
      siteHostname: meta.siteHostname,
      siteLabel: meta.siteLabel,
      url: creds.url,
      email: creds.email,
      username: creds.username,
      password: creds.password,
      storageState,
    });

    const screenshot = await takeScreenshot(page);
    const finalUrl = page.url();

    closeBrowser = false;
    await focusAutomationWindow(page);

    const actionLabel = task === "search" ? "Search" : "Navigation";

    return {
      success: true,
      message: `${actionLabel} completed on ${meta.siteLabel} for "${query.trim()}". A Chrome window is open on your desktop — browse the results there.`,
      screenshot,
      finalUrl,
      query: query.trim(),
      siteLabel: meta.siteLabel,
      browserSessionOpen: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return {
      success: false,
      message,
      screenshot: "",
    };
  } finally {
    if (browser) {
      if (closeBrowser) {
        await context?.close().catch(() => null);
        await browser.close().catch(() => null);
      } else {
        retainAutomationSession(browser, context);
      }
    }
  }
}
