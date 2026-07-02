import type { ParsedTask } from "./types";

export function parseTaskIntent(input: string): ParsedTask | null {
  const trimmed = input.trim();
  if (trimmed.length < 2) return null;

  const searchPatterns = [
    /^search\s+(?:for\s+)?(.+)$/i,
    /^find\s+(.+)$/i,
    /^look\s+for\s+(.+)$/i,
  ];

  for (const pattern of searchPatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { task: "search", query: match[1].trim(), rawInput: trimmed };
    }
  }

  const navigatePatterns = [
    /^(?:go to|open|visit)\s+(.+)$/i,
    /^navigate\s+to\s+(.+)$/i,
  ];

  for (const pattern of navigatePatterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return { task: "navigate", query: match[1].trim(), rawInput: trimmed };
    }
  }

  return { task: "search", query: trimmed, rawInput: trimmed };
}

export function describeParsedTask(parsed: ParsedTask): string {
  if (parsed.task === "search") {
    return `Search for "${parsed.query}"`;
  }
  return `Open "${parsed.query}"`;
}
