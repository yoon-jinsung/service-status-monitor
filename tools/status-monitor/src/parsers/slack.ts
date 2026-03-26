import type { PollResult } from '../types.js';

interface SlackStatusResponse {
  status: string;
  [key: string]: unknown;
}

export async function parseSlackStatus(statusUrl: string): Promise<PollResult> {
  const response = await fetch(statusUrl, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Slack status API returned ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as SlackStatusResponse;
  const isOk = data.status === 'ok';

  return {
    indicator: isOk ? 'none' : 'major',
    description: isOk ? 'Slack is operating normally' : `Slack status: ${data.status}`,
  };
}
