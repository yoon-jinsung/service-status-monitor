# 서비스 상태 모니터링 — 태스크 목록

## 완료된 작업 (코드 구현)

| #   | 태스크                                           | 산출물                                                               | 상태 |
| --- | ------------------------------------------------ | -------------------------------------------------------------------- | ---- |
| 1   | 프로젝트 초기화 (package.json, 디렉토리 구조)    | `tools/status-monitor/`, `config/`, `state/`, `logs/`                | ✅   |
| 2   | 설정 파일 작성 (config/services.json, config.ts) | `config/services.json`, `src/config.ts`                              | ✅   |
| 3   | Statuspage API 폴러 및 파서 구현                 | `src/poller.ts`, `src/parsers/statuspage.ts`, `src/parsers/slack.ts` | ✅   |
| 4   | AWS Health API 파서 구현                         | `src/parsers/aws.ts` (UTF-16BE 디코딩 처리)                          | ✅   |
| 5   | AWS RSS 피드 파서 구현                           | `src/parsers/aws-rss.ts`                                             | ✅   |
| 6   | 상태 변화 감지 로직 구현                         | `src/detector.ts`                                                    | ✅   |
| 7   | 상태 저장 모듈 구현                              | `src/state.ts`                                                       | ✅   |
| 8   | Slack Webhook 알림 모듈 구현 (Status URL 포함)   | `src/notifier.ts`                                                    | ✅   |
| 9   | 인시던트 이력 기록 모듈 구현                     | `src/logger.ts`                                                      | ✅   |
| 10  | 메인 실행 스크립트 구현                          | `check.ts`                                                           | ✅   |
| 11  | GitHub Actions 워크플로우 작성                   | `.github/workflows/status-monitor.yml`, `keepalive.yml`              | ✅   |
| 12  | 초기 상태/로그 파일 생성                         | `state/status.json`, `logs/incidents.json`                           | ✅   |
| 13  | 테스트 알림 스크립트 작성                        | `test-notification.ts` (6개 서비스 시뮬레이션)                       | ✅   |
| 14  | cron-job.org 연동 (정확한 5분 주기)              | workflow_dispatch 트리거로 전환                                      | ✅   |
| 15  | Actions v5 + Node.js 22 업그레이드               | deprecated 경고 해결                                                 | ✅   |

## 완료된 작업 (외부 설정)

| #   | 태스크                                                                      | 상태 |
| --- | --------------------------------------------------------------------------- | ---- |
| 1   | Slack App 생성 및 Incoming Webhook 설정 → `#ce-service-status-monitor` 채널 | ✅   |
| 2   | GitHub Secrets에 `SLACK_WEBHOOK_URL` 등록                                   | ✅   |
| 3   | GitHub 리포지토리 생성 및 초기 푸시                                         | ✅   |
| 4   | cron-job.org 계정 생성 및 5분 주기 Cron Job 설정                            | ✅   |
| 5   | GitHub Fine-grained PAT 생성 (Actions 권한)                                 | ✅   |
| 6   | 동작 확인 — workflow_dispatch로 수동 테스트 완료                            | ✅   |

## 해결된 이슈

| 이슈                           | 원인                             | 해결                                             |
| ------------------------------ | -------------------------------- | ------------------------------------------------ |
| ES 모듈에서 `__dirname` 에러   | ESM에서 `__dirname` 미제공       | `import.meta.url` + `fileURLToPath` 사용         |
| keepalive.yml YAML 문법 에러   | `[skip ci]` 대괄호가 배열로 파싱 | 파이프(`\|`) 멀티라인 문자열 사용                |
| `SLACK_WEBHOOK_URL` 미설정     | Secret 이름 불일치               | `SLACK_STATUS_WEBHOOK_URL` → `SLACK_WEBHOOK_URL` |
| config/services.json 경로 에러 | 상대 경로 `../../` 오류          | `../../../`로 수정                               |
| Notion 폴링 JSON 파싱 에러     | 리다이렉트된 URL                 | `status.notion.so` → `notion-status.com`         |
| AWS API JSON 파싱 에러         | UTF-16 인코딩 응답               | `TextDecoder("utf-16be")` 수동 디코딩            |
| Node.js 20 deprecated 경고     | Actions v4 + Node 20             | Actions v5 + Node.js 22로 업그레이드             |
| GitHub Actions cron 부정확     | 무료 플랜 스케줄러 제약          | cron-job.org로 외부 트리거 전환                  |
