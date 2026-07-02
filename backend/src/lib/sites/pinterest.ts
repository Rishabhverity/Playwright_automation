import type { Page } from "playwright";
import { TIMEOUT_MS } from "../loginAutomation";

export const PINTEREST_LOGIN_URL = "https://www.pinterest.com/login/";
export const PINTEREST_HOME_URL = "https://www.pinterest.com/";

export function pinterestSearchUrl(query: string) {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
}

export function isPinterestLoginUrl(url: string) {
  return /pinterest\.com\/login/i.test(url);
}

export async function isPinterestLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (isPinterestLoginUrl(url)) return false;

  const loginLink = page.locator('a[href*="/login"]').first();
  if (await loginLink.isVisible().catch(() => false)) {
    return false;
  }

  const profileButton = page.locator(
    [
      '[data-test-id="header-profile"]',
      'button[aria-label*="profile" i]',
      'div[data-test-id="gestalt-avatar-svg"]',
      'a[href*="/settings"]',
    ].join(", ")
  );

  return (await profileButton.count()) > 0;
}

export async function waitForPinterestSearchResults(page: Page, query: string) {
  await page
    .waitForURL(/\/search\/pins/i, { timeout: TIMEOUT_MS })
    .catch(() => null);

  await page
    .waitForSelector(
      [
        '[data-test-id="pin"]',
        '[data-test-id="pinWrapper"]',
        'div[data-test-id="grid"]',
        'h1:has-text("results")',
      ].join(", "),
      { timeout: TIMEOUT_MS }
    )
    .catch(() => null);

  await page.waitForTimeout(1500);

  const bodyText = await page.locator("body").innerText().catch(() => "");
  const hasQuery = bodyText.toLowerCase().includes(query.toLowerCase());

  return hasQuery || /\/search\/pins/i.test(page.url());
}

export async function runPinterestSearch(page: Page, query: string): Promise<void> {
  const searchUrl = pinterestSearchUrl(query);
  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: TIMEOUT_MS,
  });

  if (isPinterestLoginUrl(page.url())) {
    throw new Error("Session expired — please log in again.");
  }

  const ready = await waitForPinterestSearchResults(page, query);
  if (!ready) {
    const searchInput = page
      .locator(
        [
          'input[data-test-id="search-box-input"]',
          'input[placeholder*="Search" i]',
          'input[aria-label*="Search" i]',
        ].join(", ")
      )
      .first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill(query);
      await searchInput.press("Enter");
      await waitForPinterestSearchResults(page, query);
    }
  }
}
