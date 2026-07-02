import type { Page } from "playwright";
import { TIMEOUT_MS } from "../loginAutomation";
import { originFromUrl } from "../siteUtils";

const SEARCH_INPUT_SELECTORS = [
  'input[type="search"]',
  'input[name="q"]',
  'input[name="query"]',
  'input[name="search"]',
  'input[placeholder*="Search" i]',
  'input[aria-label*="Search" i]',
  'input[role="searchbox"]',
  '[data-testid*="search" i] input',
];

export async function isGenericLoggedIn(page: Page, loginUrl: string): Promise<boolean> {
  const current = page.url();
  if (/login|signin|sign-in|auth/i.test(current)) return false;

  const loginUrlHost = (() => {
    try {
      return new URL(loginUrl).hostname;
    } catch {
      return "";
    }
  })();

  if (loginUrlHost && current.includes(loginUrlHost) && /login|signin/i.test(current)) {
    return false;
  }

  const passwordField = page.locator('input[type="password"]:visible').first();
  if (await passwordField.isVisible().catch(() => false)) {
    return false;
  }

  return true;
}

export async function runGenericSearch(
  page: Page,
  query: string,
  baseUrl: string
): Promise<void> {
  const origin = originFromUrl(baseUrl);
  await page.goto(origin, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUT_MS,
  });

  for (const selector of SEARCH_INPUT_SELECTORS) {
    const input = page.locator(selector).first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(query);
      await input.press("Enter");
      await page.waitForTimeout(2000);
      return;
    }
  }

  const searchUrl = `${origin}/search?q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUT_MS,
  });
}

export async function runGenericNavigate(
  page: Page,
  target: string,
  baseUrl: string
): Promise<void> {
  const destination = target.startsWith("http")
    ? target
    : `${originFromUrl(baseUrl)}/${target.replace(/^\//, "")}`;

  await page.goto(destination, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUT_MS,
  });
}
