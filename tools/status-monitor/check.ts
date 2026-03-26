/// <reference types="node" />
import { loadConfig, getEnabledServices } from './src/config.js';
import { loadState, saveState } from './src/state.js';
import { pollAll } from './src/poller.js';
import { detectChanges } from './src/detector.js';
import { sendNotifications } from './src/notifier.js';
import { logIncidents } from './src/logger.js';
import type { ServiceState, StatusChange } from './src/types.js';

async function main(): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[check] SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 1. 설정 로드 + enabled 서비스 필터링
  const config = await loadConfig();
  const enabledServices = getEnabledServices(config);

  if (enabledServices.length === 0) {
    console.log('[check] 활성화된 서비스가 없습니다. 종료합니다.');
    return;
  }

  // 2. 이전 상태 로드
  const snapshot = await loadState();

  // 3. 각 서비스 상태 API 병렬 호출
  const pollResults = await pollAll(enabledServices);

  // 4. 이전 상태와 현재 상태 비교하여 변화 감지
  const changes: StatusChange[] = detectChanges(
    snapshot.services,
    pollResults,
    enabledServices,
  );

  // 5. 변화가 있으면 알림 전송 + 인시던트 기록
  if (changes.length > 0) {
    console.log(`[check] ${changes.length}건의 상태 변화 감지됨`);
    await sendNotifications(changes, webhookUrl);
    await logIncidents(changes);
  } else {
    console.log('[check] 상태 변화 없음');
  }

  // 6. state 업데이트
  const now = new Date().toISOString();
  snapshot.lastChecked = now;

  const changedServiceNames = new Set(changes.map((c) => c.service));

  for (const service of enabledServices) {
    const result = pollResults[service.name];
    const prev: ServiceState = snapshot.services[service.name] ?? {
      indicator: 'none',
      description: '',
      lastChanged: '',
      lastNotified: '',
      consecutiveFailures: 0,
    };

    if (result === null) {
      // 폴링 실패: consecutiveFailures 증가
      prev.consecutiveFailures += 1;
      console.error(
        `[check] ${service.name} 폴링 실패 (연속 ${prev.consecutiveFailures}회)`,
      );

      // consecutiveFailures가 3이 되면 모니터링 실패 알림 전송
      if (prev.consecutiveFailures === 3) {
        console.error(
          `[check] ${service.name} 연속 3회 폴링 실패 - 모니터링 실패 알림 전송`,
        );
        const failureChange: StatusChange = {
          service: service.name,
          previous: prev.indicator,
          current: 'critical',
          description: `${service.name} 모니터링 폴링이 연속 3회 실패했습니다. 상태 페이지 접근을 확인해주세요.`,
          serviceConfig: service,
        };
        await sendNotifications([failureChange], webhookUrl);
      }
    } else {
      // 폴링 성공: indicator/description 업데이트, consecutiveFailures 리셋
      prev.indicator = result.indicator;
      prev.description = result.description;
      prev.consecutiveFailures = 0;

      // 변화가 있으면 lastChanged/lastNotified 업데이트
      if (changedServiceNames.has(service.name)) {
        prev.lastChanged = now;
        prev.lastNotified = now;
      }
    }

    snapshot.services[service.name] = prev;
  }

  // 7. state 저장
  await saveState(snapshot);
  console.log('[check] 완료');
}

try {
  await main();
} catch (error) {
  console.error('[check] 예상치 못한 에러 발생:', error);
  process.exit(1);
}
