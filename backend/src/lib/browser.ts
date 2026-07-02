import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const LAUNCH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--start-maximized",
  "--window-position=0,0",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
];

/**
 * Use Playwright's bundled Chromium (not system Chrome).
 * System Chrome (channel: 'chrome') often closes when the Playwright session ends.
 */
export async function launchAutomationBrowser(): Promise<Browser> {
  const headless = process.env.PLAYWRIGHT_HEADLESS === "true";

  return chromium.launch({
    headless,
    args: LAUNCH_ARGS,
  });
}

export async function createAutomationContext(
  browser: Browser,
  storageStatePath?: string
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: headlessViewport(),
    userAgent: DEFAULT_USER_AGENT,
    locale: "en-US",
    ...(storageStatePath ? { storageState: storageStatePath } : {}),
  });
}

function headlessViewport() {
  return process.env.PLAYWRIGHT_HEADLESS === "true"
    ? { width: 1366, height: 900 }
    : null;
}

/** Bring the automation window to the front on Windows/macOS/Linux. */
export async function focusAutomationWindow(page: Page): Promise<void> {
  await page.bringToFront().catch(() => null);
  await page.waitForTimeout(400);

  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send("Browser.getWindowForTarget");
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "maximized" },
    });
    await cdp.send("Page.bringToFront");
    await cdp.detach();
  } catch {
    // CDP focus is best-effort; bringToFront above still helps
  }

  await page.bringToFront().catch(() => null);
}
