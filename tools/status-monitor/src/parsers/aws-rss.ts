import type { Indicator, PollResult } from "../types.js";

// RSS 항목에서 제목과 날짜 추출
interface RssItem {
  title: string;
  pubDate: string;
}

function extractTagContent(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const block = match[1];
    const title = extractTagContent(block, "title").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    const pubDate = extractTagContent(block, "pubDate").trim();
    items.push({ title, pubDate });
  }

  return items;
}

function isWithin24Hours(pubDate: string): boolean {
  const date = new Date(pubDate);
  if (isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() < 24 * 60 * 60 * 1000;
}

// 제목에서 심각도 판단
function inferIndicator(title: string): Indicator {
  const lower = title.toLowerCase();
  if (lower.includes("disruption") || lower.includes("unavailable")) return "critical";
  if (lower.includes("degraded") || lower.includes("increased error") || lower.includes("elevated")) return "major";
  if (lower.includes("latency") || lower.includes("intermittent")) return "minor";
  return "minor"; // 미해결 항목이 있으면 최소 minor
}

export async function parseAwsRss(statusUrl: string): Promise<PollResult> {
  const response = await fetch(statusUrl, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });

  if (!response.ok) {
    throw new Error(`AWS RSS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const items = parseItems(xml);

  // 최근 24시간 내 미해결 항목만 필터
  const activeItems = items.filter(
    (item) => !item.title.toUpperCase().startsWith("RESOLVED") && isWithin24Hours(item.pubDate),
  );

  if (activeItems.length === 0) {
    return { indicator: "none", description: "All Systems Operational" };
  }

  // 가장 심각한 상태 결정
  const indicators: Indicator[] = activeItems.map((item) => inferIndicator(item.title));
  const severity: Indicator[] = ["critical", "major", "minor", "none"];
  const worstIndicator = severity.find((s) => indicators.includes(s)) ?? "minor";

  const description = activeItems
    .slice(0, 2)
    .map((item) => item.title)
    .join("; ");

  return { indicator: worstIndicator, description };
}
