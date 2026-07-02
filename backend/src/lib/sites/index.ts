import type { Page } from "playwright";
import type { TaskType } from "../types";
import { isGenericLoggedIn, runGenericNavigate, runGenericSearch } from "./generic";
import {
  isPinterestLoggedIn,
  PINTEREST_HOME_URL,
  runPinterestSearch,
} from "./pinterest";

export async function isSiteLoggedIn(
  page: Page,
  siteHostname: string,
  loginUrl: string
): Promise<boolean> {
  if (siteHostname.includes("pinterest.com")) {
    return isPinterestLoggedIn(page);
  }
  return isGenericLoggedIn(page, loginUrl);
}

export async function getSiteHomeUrl(siteHostname: string, loginUrl: string): Promise<string> {
  if (siteHostname.includes("pinterest.com")) {
    return PINTEREST_HOME_URL;
  }
  try {
    return new URL(loginUrl).origin;
  } catch {
    return loginUrl;
  }
}

export async function runSiteTask(
  page: Page,
  siteHostname: string,
  task: TaskType,
  query: string,
  loginUrl: string
): Promise<void> {
  if (task === "navigate") {
    await runGenericNavigate(page, query, loginUrl);
    return;
  }

  if (siteHostname.includes("pinterest.com")) {
    await runPinterestSearch(page, query);
    return;
  }

  await runGenericSearch(page, query, loginUrl);
}
