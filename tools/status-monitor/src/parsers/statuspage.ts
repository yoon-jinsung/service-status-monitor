import type { Indicator, PollResult } from '../types.js';

interface StatuspageResponse {
  status: {
    indicator: string;
    description: string;
  };
}

const INDICATOR_MAP: Record<string, Indicator> = {
  none: 'none',
  minor: 'minor',
  major: 'major',
  critical: 'critical',
};

export async function parseStatuspage(baseUrl: string): Promise<PollResult> {
  const url = `${baseUrl}/api/v2/status.json`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Statuspage API returned ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as StatuspageResponse;
  const indicator = INDICATOR_MAP[data.status.indicator] ?? 'critical';
  const description = data.status.description;

  return { indicator, description };
}
