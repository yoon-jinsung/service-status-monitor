import type { PollResult, ServiceConfig } from './types.js';
import { parseStatuspage } from './parsers/statuspage.js';
import { parseSlackStatus } from './parsers/slack.js';

async function pollService(service: ServiceConfig): Promise<PollResult> {
  switch (service.type) {
    case 'statuspage': {
      if (!service.baseUrl) {
        throw new Error(`Service "${service.name}" is missing baseUrl`);
      }
      return parseStatuspage(service.baseUrl);
    }
    case 'custom_slack': {
      if (!service.statusUrl) {
        throw new Error(`Service "${service.name}" is missing statusUrl`);
      }
      return parseSlackStatus(service.statusUrl);
    }
    default:
      throw new Error(`Unknown service type: ${(service as ServiceConfig).type}`);
  }
}

export async function pollAll(
  services: ServiceConfig[],
): Promise<Record<string, PollResult | null>> {
  const enabled = services.filter((s) => s.enabled);

  const results = await Promise.allSettled(enabled.map((s) => pollService(s)));

  const output: Record<string, PollResult | null> = {};

  for (let i = 0; i < enabled.length; i++) {
    const service = enabled[i];
    const result = results[i];

    if (result.status === 'fulfilled') {
      output[service.name] = result.value;
    } else {
      console.error(`[poller] ${service.name} polling failed:`, result.reason);
      output[service.name] = null;
    }
  }

  return output;
}
