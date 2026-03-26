import { gunzipSync } from "node:zlib";
import type { Indicator, PollResult } from "../types.js";

interface AWSEvent {
  status: string; // "1" = info, "2" = degraded, "3" = disrupted
  service_name: string;
  summary: string;
  region_name: string;
}

const STATUS_MAP: Record<string, Indicator> = {
  "1": "minor", // Informational
  "2": "major", // Degraded
  "3": "critical", // Disrupted
};

export async function parseAWS(): Promise<PollResult> {
  const url = "https://health.aws.amazon.com/public/currentevents";
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `AWS Health API returned ${response.status}: ${response.statusText}`,
    );
  }

  // gzip 압축된 응답을 수동으로 해제
  const buffer = await response.arrayBuffer();
  const decompressed = gunzipSync(Buffer.from(buffer));
  const events = JSON.parse(decompressed.toString("utf-8")) as AWSEvent[];

  // 이벤트가 없으면 정상 상태
  if (!events || events.length === 0) {
    return {
      indicator: "none",
      description: "All Systems Operational",
    };
  }

  // 가장 심각한 상태 찾기
  let worstIndicator: Indicator = "none";
  const descriptions: string[] = [];

  for (const event of events) {
    const indicator = STATUS_MAP[event.status] ?? "minor";

    // 심각도 비교: critical > major > minor > none
    if (
      indicator === "critical" ||
      (indicator === "major" && worstIndicator !== "critical") ||
      (indicator === "minor" && worstIndicator === "none")
    ) {
      worstIndicator = indicator;
    }

    descriptions.push(`[${event.region_name}] ${event.summary}`);
  }

  return {
    indicator: worstIndicator,
    description: descriptions.slice(0, 3).join("; "), // 최대 3개 이벤트만 표시
  };
}
