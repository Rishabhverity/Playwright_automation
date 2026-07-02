import {
  type Browser,
  type BrowserContext,
  type Frame,
  type Locator,
  type Page,
} from "playwright";

export const TIMEOUT_MS = 20_000;
const TOTAL_BUDGET_MS = 90_000;
const PAGE_SETTLE_MS = 1000;

import {
  createAutomationContext,
  focusAutomationWindow,
  launchAutomationBrowser,
} from "./browser";
import { retainAutomationSession } from "./browserRegistry";
import { saveSession } from "./sessionStorage";
import type { LoginAutomationInput, LoginAutomationResult } from "./types";

export type { LoginAutomationInput, LoginAutomationResult };

type SearchContext = Page | Frame;

const LOGIN_TRIGGER_SELECTORS = [
  'a[href*="login" i]',
  'a[href*="signin" i]',
  'a[href*="sign-in" i]',
  'button:has-text("Log in")',
  'button:has-text("Login")',
  'button:has-text("Sign in")',
  'button:has-text("Sign In")',
  'a:has-text("Log in")',
  'a:has-text("Login")',
  'a:has-text("Sign in")',
  'a:has-text("Sign In")',
  '[data-testid*="login" i]',
  '[data-test-id*="login" i]',
  '[aria-label*="log in" i]',
  '[aria-label*="sign in" i]',
];

const ADVANCE_BUTTON_PATTERNS = [
  /continue with email/i,
  /continue to email/i,
  /continue/i,
  /next/i,
  /proceed/i,
  /verify email/i,
];

async function takeScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false });
  return buffer.toString("base64");
}

function assertTimeBudget(startedAt: number) {
  if (Date.now() - startedAt > TOTAL_BUDGET_MS) {
    throw new Error("Automation timed out");
  }
}

async function firstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

function getSearchContexts(page: Page): SearchContext[] {
  const frames = page.frames().filter((frame) => frame !== page.mainFrame());
  return [page, ...frames];
}

async function waitForPageReady(page: Page) {
  await page.waitForLoadState("load", { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(PAGE_SETTLE_MS);
}

async function waitForPasswordField(page: Page, timeoutMs = 6000): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const field = await findPasswordField(getSearchContexts(page));
    if (field) return field;
    await page.waitForTimeout(300);
  }

  return null;
}

async function dismissOverlays(page: Page) {
  const dismissSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    'button:has-text("Allow all")',
    'button:has-text("Reject all")',
    '[aria-label="Close"]',
    'button[aria-label="close" i]',
    'button[aria-label="dismiss" i]',
  ];

  for (const selector of dismissSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 300 }).catch(() => false)) {
      await button.click({ timeout: 2000 }).catch(() => null);
      await page.waitForTimeout(500);
    }
  }
}

async function clickFirstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const el = await firstVisible(page.locator(selector));
    if (el) {
      await el.click({ timeout: 3000 }).catch(() => null);
      await page.waitForTimeout(1500);
      return true;
    }
  }
  return false;
}

async function openLoginUi(page: Page) {
  await clickFirstVisible(page, LOGIN_TRIGGER_SELECTORS);
}

async function tryNavigateToLoginPage(page: Page, currentUrl: string) {
  if (/login|signin|sign-in|sign_in|auth|wp-login|accounts\./i.test(currentUrl)) {
    return;
  }

  const origin = new URL(currentUrl).origin;
  const quickPaths = ["/login", "/signin", "/sign-in"];

  for (const path of quickPaths) {
    try {
      await page.goto(`${origin}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
      await waitForPageReady(page);
      const fields = await findLoginFields(page);
      if (fields.identifierField || fields.passwordField) return;
    } catch {
      continue;
    }
  }
}

async function isFieldInteractable(field: Locator): Promise<boolean> {
  return field
    .evaluate((el) => {
      const input = el as HTMLInputElement;
      if (!input || input.offsetParent === null) return false;
      const style = getComputedStyle(input);
      if (style.visibility === "hidden" || style.display === "none") return false;
      if (Number(style.opacity) < 0.1) return false;
      const rect = input.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      return !input.disabled && !input.readOnly;
    })
    .catch(() => false);
}

async function findActivePasswordField(page: Page): Promise<Locator | null> {
  const contexts = getSearchContexts(page);
  const selectors = [
    'input[name="account[password]"]',
    'input#account_password',
    'input[type="password"]',
    'input[name="password"]',
    'input[id="password"]',
    'input[name*="pass" i]',
    'input[autocomplete="current-password"]',
  ];

  for (const context of contexts) {
    for (const selector of selectors) {
      const locator = context.locator(selector);
      const count = await locator.count();
      for (let i = 0; i < count; i++) {
        const field = locator.nth(i);
        if (await isFieldInteractable(field)) {
          return field;
        }
      }
    }
  }

  return findPasswordField(contexts);
}

async function fillPasswordReliably(page: Page, password: string): Promise<Locator | null> {
  if (await isEmailStepStillActive(page)) {
    await advancePastEmailStep(page);
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const field = await findActivePasswordField(page);
    if (!field) {
      await page.waitForTimeout(800);
      continue;
    }

    await field.scrollIntoViewIfNeeded().catch(() => null);
    await field.click({ timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(300);

    try {
      await field.fill("", { timeout: 2000 });
      await field.fill(password, { timeout: 5000 });
    } catch {
      await field.press("Control+a").catch(() => null);
      await field.press("Backspace").catch(() => null);
      await field.type(password, { delay: 50 });
    }

    const value = await field.inputValue().catch(() => "");
    if (value.length > 0) {
      return field;
    }

    await page.waitForTimeout(800);
  }

  return null;
}

async function isEmailStepStillActive(page: Page): Promise<boolean> {
  const continueWithEmail = await firstVisible(
    page.getByRole("button", { name: /continue with email/i })
  );
  if (continueWithEmail) return true;

  const advanceButton = await findAdvanceButton(page);
  if (advanceButton) {
    const text = ((await advanceButton.textContent()) || "").toLowerCase();
    if (/continue with email|continue to email/i.test(text)) return true;
  }

  return false;
}

async function clickContinueButton(page: Page): Promise<boolean> {
  const selectors = [
    page.getByRole("button", { name: /continue with email/i }),
    page.getByRole("button", { name: /^continue$/i }),
    page.locator('button:has-text("Continue with email")'),
    page.locator('button[type="submit"]:has-text("Continue")'),
  ];

  for (const locator of selectors) {
    const button = await firstVisible(locator);
    if (button) {
      await clickAndWaitForTransition(page, button);
      await page.waitForTimeout(2000);
      return true;
    }
  }

  const advanceButton = await findAdvanceButton(page);
  if (advanceButton) {
    const text = ((await advanceButton.textContent()) || "").toLowerCase();
    if (/continue|next|proceed/i.test(text)) {
      await clickAndWaitForTransition(page, advanceButton);
      await page.waitForTimeout(2000);
      return true;
    }
  }

  return false;
}

async function advancePastEmailStep(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await isEmailStepStillActive(page))) {
      return true;
    }

    const clicked = await clickContinueButton(page);
    if (!clicked) {
      await page.keyboard.press("Enter").catch(() => null);
      await waitForPageReady(page);
    }

    await page.waitForTimeout(1500);

    if (!(await isEmailStepStillActive(page))) {
      return true;
    }
  }

  return !(await isEmailStepStillActive(page));
}

async function waitForPasswordStepReady(
  page: Page,
  timeoutMs = 20_000
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isEmailStepStillActive(page)) {
      await clickContinueButton(page);
      await page.waitForTimeout(1000);
      continue;
    }

    const field = await findActivePasswordField(page);
    if (field) return field;

    await page.waitForTimeout(500);
  }

  return findActivePasswordField(page);
}

async function proceedToPasswordStep(page: Page, identifierField: Locator | null) {
  await advancePastEmailStep(page);
  await waitForPasswordStepReady(page, 20_000);
}

async function findPasswordField(contexts: SearchContext[]): Promise<Locator | null> {
  const scopes = ['[role="dialog"]', '[role="alertdialog"]', "dialog[open]", "form", "body"];

  for (const scope of scopes) {
    for (const context of contexts) {
      const scoped = scope === "body" ? context.locator("body") : context.locator(scope);

      const byLabel = await firstVisible(scoped.getByLabel(/password|passcode|pin/i));
      if (byLabel) return byLabel;

      const byPlaceholder = await firstVisible(
        scoped.getByPlaceholder(/password|passcode|pin/i)
      );
      if (byPlaceholder) return byPlaceholder;
    }
  }

  const selectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id="password"]',
    'input[name*="pass" i]',
    'input[id*="pass" i]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    'input[aria-label*="password" i]',
  ];

  for (const context of contexts) {
    for (const selector of selectors) {
      const field = await firstVisible(context.locator(selector));
      if (field) return field;
    }
  }

  return null;
}

async function findIdentifierFieldInContainer(
  container: Locator,
  preferEmail: boolean
): Promise<Locator | null> {
  const labelPatterns = preferEmail
    ? [/email/i, /username|user name|user id|login/i, /phone|mobile/i]
    : [/username|user name|user id|login/i, /email/i, /phone|mobile/i];

  for (const pattern of labelPatterns) {
    const byLabel = await firstVisible(container.getByLabel(pattern));
    if (byLabel) return byLabel;
  }

  for (const pattern of labelPatterns) {
    const byPlaceholder = await firstVisible(container.getByPlaceholder(pattern));
    if (byPlaceholder) return byPlaceholder;
  }

  const roleTextbox = await firstVisible(
    container.getByRole("textbox", {
      name: preferEmail ? /email|username|user|login|phone/i : /username|user|login|email|phone/i,
    })
  );
  if (roleTextbox) return roleTextbox;

  const selectors = [
    'input[type="email"]',
    'input[type="tel"]',
    'input[name="id"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[name="user"]',
    'input[name="login"]',
    'input[name="identifier"]',
    'input[name="account[email]"]',
    'input[name="account[username]"]',
    'input#account_email',
    'input[name*="account" i]',
    'input[id="email"]',
    'input[id="username"]',
    'input[id="login-username"]',
    'input[id*="email" i]',
    'input[id*="user" i]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
    'input[placeholder*="user" i]',
    'input[placeholder*="phone" i]',
    'input[aria-label*="email" i]',
    'input[aria-label*="username" i]',
    'input[type="text"]',
    'input:not([type])',
    '[contenteditable="true"]',
  ];

  for (const selector of selectors) {
    const field = await firstVisible(
      container.locator(selector).filter({
        hasNot: container.locator(
          '[type="hidden"], [type="submit"], [type="button"], [type="checkbox"], [type="radio"], [type="search"], [type="password"]'
        ),
      })
    );
    if (field) return field;
  }

  return null;
}

async function findIdentifierNearPassword(passwordField: Locator): Promise<Locator | null> {
  const ancestors = [
    passwordField.locator("xpath=ancestor::form[1]"),
    passwordField.locator(
      'xpath=ancestor::*[@role="dialog" or @role="alertdialog" or self::dialog][1]'
    ),
    passwordField.locator(
      "xpath=ancestor::div[contains(@class,'modal') or contains(@class,'login')][1]"
    ),
  ];

  for (const container of ancestors) {
    if ((await container.count()) > 0) {
      const field = await findIdentifierFieldInContainer(container, true);
      if (field) return field;
    }
  }

  return null;
}

async function findIdentifierField(
  contexts: SearchContext[],
  preferEmail: boolean
): Promise<Locator | null> {
  const scopes = ['[role="dialog"]', '[role="alertdialog"]', "dialog[open]", "form", "body"];

  for (const scope of scopes) {
    for (const context of contexts) {
      const container = scope === "body" ? context.locator("body") : context.locator(scope);
      const count = await container.count();
      for (let i = 0; i < count; i++) {
        const field = await findIdentifierFieldInContainer(container.nth(i), preferEmail);
        if (field) return field;
      }
    }
  }

  return null;
}

async function findLoginFields(page: Page) {
  const contexts = getSearchContexts(page);

  let passwordField = await findPasswordField(contexts);
  let identifierField: Locator | null = null;

  if (passwordField) {
    identifierField = await findIdentifierNearPassword(passwordField);
  }

  if (!identifierField) {
    identifierField = await findIdentifierField(contexts, true);
  }

  if (!passwordField) {
    passwordField = await findPasswordField(contexts);
  }

  if (!identifierField) {
    identifierField = await findIdentifierField(contexts, false);
  }

  return { identifierField, passwordField };
}

function hasAnyLoginField(fields: { identifierField: Locator | null; passwordField: Locator | null }) {
  return Boolean(fields.identifierField || fields.passwordField);
}

async function waitForLoginFields(page: Page) {
  let fields = await findLoginFields(page);
  if (hasAnyLoginField(fields)) return fields;

  await openLoginUi(page);
  fields = await findLoginFields(page);
  if (hasAnyLoginField(fields)) return fields;

  await tryNavigateToLoginPage(page, page.url());
  fields = await findLoginFields(page);
  if (hasAnyLoginField(fields)) return fields;

  for (let round = 0; round < 2; round++) {
    await page.waitForTimeout(800);
    fields = await findLoginFields(page);
    if (hasAnyLoginField(fields)) return fields;
  }

  return findLoginFields(page);
}

async function findAdvanceButton(page: Page): Promise<Locator | null> {
  const contexts = getSearchContexts(page);

  for (const context of contexts) {
    for (const pattern of ADVANCE_BUTTON_PATTERNS) {
      const button = await firstVisible(context.getByRole("button", { name: pattern }));
      if (button) return button;
    }
  }

  const selectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'button:has-text("Continue with email")',
    'a:has-text("Continue")',
    'a:has-text("Next")',
  ];

  for (const context of contexts) {
    for (const selector of selectors) {
      const button = await firstVisible(context.locator(selector));
      if (button) return button;
    }
  }

  return null;
}

async function findFinalSubmitButton(page: Page, passwordField: Locator): Promise<Locator | null> {
  const contexts = getSearchContexts(page);
  const namePatterns = [/log\s*in/i, /sign\s*in/i, /submit/i, /enter/i];

  for (const context of contexts) {
    for (const pattern of namePatterns) {
      const button = await firstVisible(context.getByRole("button", { name: pattern }));
      if (button) {
        const text = ((await button.textContent()) || "").toLowerCase();
        if (!/continue with email|next|proceed/i.test(text)) {
          return button;
        }
      }
    }
  }

  const selectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("Sign In")',
    'input[value*="Log" i]',
    'input[value*="Sign" i]',
  ];

  for (const context of contexts) {
    for (const selector of selectors) {
      const button = await firstVisible(context.locator(selector));
      if (button) return button;
    }
  }

  const form = passwordField.locator("xpath=ancestor::form[1]");
  if ((await form.count()) > 0) {
    const formSubmit = await firstVisible(
      form.locator('button[type="submit"], input[type="submit"], button')
    );
    if (formSubmit) return formSubmit;
  }

  return null;
}

async function fillField(field: Locator, value: string) {
  await field.scrollIntoViewIfNeeded().catch(() => null);
  await field.click({ timeout: 5000 }).catch(() => null);

  try {
    await field.fill(value, { timeout: 5000 });
  } catch {
    await field.press("Control+a").catch(() => null);
    await field.type(value, { delay: 30 });
  }
}

async function clickAndWaitForTransition(page: Page, button: Locator) {
  const urlBefore = page.url();

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => null),
    button.click({ timeout: 4000 }),
  ]);

  await page.waitForTimeout(PAGE_SETTLE_MS);

  if (page.url() === urlBefore) {
    await page
      .locator('input[type="password"]')
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => null);
  }

  await waitForPageReady(page);
}

async function completeIdentifierStep(
  page: Page,
  identifierField: Locator,
  fillValue: string
) {
  await fillField(identifierField, fillValue);
  await page.waitForTimeout(800);

  const filled = await identifierField.inputValue().catch(() => "");
  if (!filled) {
    await fillField(identifierField, fillValue);
  }
}

async function detectCaptcha(page: Page): Promise<boolean> {
  return page
    .locator(
      'iframe[src*="recaptcha"], iframe[src*="captcha"], iframe[title*="recaptcha" i], .g-recaptcha, [class*="captcha" i], [id*="captcha" i], [class*="hcaptcha" i]'
    )
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);
}

async function detectLoginFailure(page: Page): Promise<boolean> {
  if (await detectCaptcha(page)) {
    return true;
  }

  const failurePatterns = [
    /invalid (username|email|password|credentials)/i,
    /incorrect (username|email|password|credentials)/i,
    /wrong (username|email|password|credentials)/i,
    /login failed/i,
    /authentication failed/i,
    /couldn.?t (log|sign) you in/i,
    /unable to (log|sign) in/i,
    /password is incorrect/i,
    /username or password/i,
    /no account found/i,
    /doesn.?t match/i,
  ];

  for (const pattern of failurePatterns) {
    const match = page.getByText(pattern).first();
    if (await match.isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
  }

  return false;
}

async function detectLoginSuccess(page: Page, initialUrl: string): Promise<boolean> {
  const currentUrl = page.url();
  if (currentUrl !== initialUrl && !/login|signin|sign-in|sign_in|auth|lookup/i.test(currentUrl)) {
    return true;
  }

  const successPatterns = [
    /welcome/i,
    /dashboard/i,
    /my account/i,
    /logged in/i,
    /log out/i,
    /sign out/i,
    /admin/i,
  ];

  for (const pattern of successPatterns) {
    const match = page.getByText(pattern).first();
    if (await match.isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }
  }

  const passwordGone = !(await firstVisible(page.locator('input[type="password"]')));
  const loginButtonGone = !(await firstVisible(
    page.getByRole("button", { name: /log\s*in|sign\s*in|continue with email/i })
  ));

  return passwordGone && loginButtonGone;
}

function buildIdentifierValue(
  identifierField: Locator,
  username: string | undefined,
  email: string | undefined,
  fallback: string
): Promise<string> {
  return identifierField.evaluate((el, values) => {
    const input = el as HTMLInputElement;
    const type = (input.getAttribute("type") || "").toLowerCase();
    const name = (input.getAttribute("name") || "").toLowerCase();
    const placeholder = (input.getAttribute("placeholder") || "").toLowerCase();
    const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();
    const ariaLabel = (input.getAttribute("aria-label") || "").toLowerCase();

    const looksLikeEmail =
      type === "email" ||
      name.includes("email") ||
      name.includes("account") ||
      placeholder.includes("email") ||
      autocomplete.includes("email") ||
      ariaLabel.includes("email");

    if (looksLikeEmail && values.email) return values.email;
    if (values.username) return values.username;
    return values.fallback;
  }, { username, email, fallback });
}

export async function runLoginAutomation(
  input: LoginAutomationInput
): Promise<LoginAutomationResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let closeBrowser = true;
  const startedAt = Date.now();

  try {
    const {
      url,
      username,
      email,
      password,
      sessionId,
      userId,
      siteHostname,
      siteLabel,
      persistSession = false,
      closeAfterSave = false,
    } = input;
    const identifier = email || username;

    if (!identifier) {
      return {
        success: false,
        message: "Username or email is required.",
        screenshot: "",
      };
    }

    browser = await launchAutomationBrowser();
    context = await createAutomationContext(browser);

    const page = await context.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);

    const initialUrl = url.startsWith("http") ? url : `https://${url}`;

    try {
      await page.goto(initialUrl, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT_MS,
      });
    } catch {
      return {
        success: false,
        message: "Could not reach the website",
        screenshot: "",
      };
    }

    await waitForPageReady(page);
    await dismissOverlays(page);
    assertTimeBudget(startedAt);

    if (await detectCaptcha(page)) {
      return {
        success: false,
        message: "Login blocked by CAPTCHA or verification – automated login cannot complete on this site",
        screenshot: await takeScreenshot(page),
      };
    }

    let fields = await waitForLoginFields(page);

    if (!hasAnyLoginField(fields)) {
      return {
        success: false,
        message: "No login form detected on this page",
        screenshot: await takeScreenshot(page),
      };
    }

    if (fields.identifierField) {
      const fillValue = await buildIdentifierValue(
        fields.identifierField,
        username,
        email,
        identifier
      );
      await completeIdentifierStep(page, fields.identifierField, fillValue);
    }

    assertTimeBudget(startedAt);

    if (await isEmailStepStillActive(page)) {
      const advanced = await advancePastEmailStep(page);
      if (!advanced) {
        return {
          success: false,
          message: "Could not click Continue after entering email — check the screenshot",
          screenshot: await takeScreenshot(page),
        };
      }
    }

    await proceedToPasswordStep(page, fields.identifierField);

    const passwordField = await fillPasswordReliably(page, password);

    assertTimeBudget(startedAt);

    if (!passwordField) {
      return {
        success: false,
        message: "Could not fill the password field — the site may use an extra login step we could not complete",
        screenshot: await takeScreenshot(page),
      };
    }

    const submitButton = await findFinalSubmitButton(page, passwordField);

    if (submitButton) {
      await clickAndWaitForTransition(page, submitButton);
    } else {
      await Promise.all([
        page.waitForNavigation({ timeout: TIMEOUT_MS }).catch(() => null),
        passwordField.press("Enter"),
      ]);
      await waitForPageReady(page);
    }

    await page.waitForTimeout(1500);

    const loginFailed = await detectLoginFailure(page);
    const loginSucceeded = await detectLoginSuccess(page, initialUrl);
    const screenshot = await takeScreenshot(page);

    if (loginFailed && !loginSucceeded) {
      const hasCaptcha = await detectCaptcha(page);

      return {
        success: false,
        message: hasCaptcha
          ? "Login blocked by CAPTCHA or verification – automated login cannot complete on this site"
          : "Login failed – check your credentials or complete any extra verification step",
        screenshot,
      };
    }

    const finalUrl = page.url();

    if (loginSucceeded && persistSession && sessionId && userId && siteHostname && siteLabel) {
      const storageState = await context.storageState();
      await saveSession({
        sessionId,
        userId,
        siteHostname,
        siteLabel,
        url: initialUrl,
        email,
        username,
        password,
        storageState,
      });

      if (closeAfterSave) {
        closeBrowser = true;
        return {
          success: true,
          message: `Login successful! Your ${siteLabel} session is saved.`,
          screenshot,
          finalUrl,
          browserSessionOpen: false,
          sessionId,
          siteLabel,
        };
      }

      closeBrowser = false;
      await focusAutomationWindow(page);

      return {
        success: true,
        message: `Login successful! A Chrome window is open on your desktop — you are logged in to ${siteLabel}. Browse there; close the window when you are done.`,
        screenshot,
        finalUrl,
        browserSessionOpen: true,
        sessionId,
        siteLabel,
      };
    }

    if (loginSucceeded) {
      closeBrowser = false;
      await focusAutomationWindow(page);
    }

    return {
      success: loginSucceeded,
      message: loginSucceeded
        ? "Login successful! A browser window is open on your desktop — you are logged in there."
        : "Login attempt finished — verify the screenshot for details.",
      screenshot,
      finalUrl: loginSucceeded ? finalUrl : undefined,
      browserSessionOpen: loginSucceeded,
      sessionId: loginSucceeded && sessionId ? sessionId : undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return {
      success: false,
      message: message.includes("Timeout")
        ? "Operation timed out. The website may be slow or unresponsive."
        : message,
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
