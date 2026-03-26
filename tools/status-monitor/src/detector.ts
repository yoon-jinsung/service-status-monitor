import type {
  Indicator,
  PollResult,
  ServiceConfig,
  ServiceState,
  StatusChange,
} from './types.js';

export function detectChanges(
  previousStates: Record<string, ServiceState>,
  currentResults: Record<string, PollResult | null>,
  serviceConfigs: ServiceConfig[],
): StatusChange[] {
  const changes: StatusChange[] = [];

  for (const config of serviceConfigs) {
    const result = currentResults[config.name];
    if (result === null || result === undefined) continue;

    const prev = previousStates[config.name];
    const previousIndicator: Indicator = prev?.indicator ?? 'none';

    // 이전 상태와 동일하면 변화 없음
    if (previousIndicator === result.indicator) continue;

    // 최초 체크 시 정상('none')이면 알림 불필요
    if (!prev && result.indicator === 'none') continue;

    changes.push({
      service: config.name,
      previous: previousIndicator,
      current: result.indicator,
      description: result.description,
      serviceConfig: config,
    });
  }

  return changes;
}
