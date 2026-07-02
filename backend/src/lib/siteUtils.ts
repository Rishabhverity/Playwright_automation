export function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "unknown";
  }
}

export function labelFromHostname(hostname: string): string {
  const base = hostname.replace(/^www\./, "").split(".")[0];
  if (!base) return hostname;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function originFromUrl(url: string): string {
  return new URL(normalizeUrl(url)).origin;
}
