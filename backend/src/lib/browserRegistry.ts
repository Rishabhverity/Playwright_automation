import type { Browser, BrowserContext } from "playwright";

/**
 * Playwright closes browsers when Browser/Context objects are garbage-collected.
 * Keep module-level references so windows stay open after the API responds.
 */
const retainedBrowsers = new Set<Browser>();
const retainedContexts = new Set<BrowserContext>();

export function retainAutomationSession(
  browser: Browser,
  context: BrowserContext | null
): void {
  retainedBrowsers.add(browser);
  browser.once("disconnected", () => {
    retainedBrowsers.delete(browser);
  });

  if (context) {
    retainedContexts.add(context);
    context.once("close", () => {
      retainedContexts.delete(context);
    });
  }
}

export async function closeRetainedBrowser(browser: Browser): Promise<void> {
  retainedBrowsers.delete(browser);
  await browser.close().catch(() => null);
}

export function retainedBrowserCount(): number {
  return retainedBrowsers.size;
}
