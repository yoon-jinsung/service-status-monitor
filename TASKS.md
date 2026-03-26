# 서비스 상태 모니터링 — 태스크 목록

## Claude가 할 일 (코드 구현) — 10개

| # | 태스크 | 산출물 | Phase |
|---|--------|--------|-------|
| 1 | 프로젝트 초기화 (package.json, 디렉토리 구조) | `tools/status-monitor/`, `config/`, `state/`, `logs/` | MVP |
| 2 | 설정 파일 작성 (config/services.json, config.js) | `config/services.json`, `src/config.js` | MVP |
| 3 | Statuspage API 폴러 및 파서 구현 | `src/poller.js`, `src/parsers/statuspage.js`, `src/parsers/slack.js` | MVP |
| 4 | 상태 변화 감지 로직 구현 | `src/detector.js` | MVP |
| 5 | 상태 저장 모듈 구현 | `src/state.js` | MVP |
| 6 | Slack Webhook 알림 모듈 구현 | `src/notifier.js` | MVP |
| 7 | 인시던트 이력 기록 모듈 구현 | `src/logger.js` | MVP |
| 8 | 메인 실행 스크립트 구현 | `check.js` | MVP |
| 9 | GitHub Actions 워크플로우 작성 | `.github/workflows/status-monitor.yml`, `keepalive.yml` | MVP |
| 10 | 초기 상태/로그 파일 생성 | `state/status.json`, `logs/incidents.json` | MVP |

## 사용자가 할 일 (외부 설정) — 4개

| # | 태스크 | 상세 |
|---|--------|------|
| 1 | Slack App 생성 및 Incoming Webhook 설정 | api.slack.com → Create New App → Incoming Webhooks On → `#dev-alerts` 채널 선택 → Webhook URL 복사 |
| 2 | GitHub Secrets에 `SLACK_STATUS_WEBHOOK_URL` 등록 | 리포지토리 Settings → Secrets and variables → Actions → New repository secret |
| 3 | GitHub 리포지토리 생성 및 초기 푸시 | 모니터링 서비스용 리포지토리 생성 (public/private) → 로컬 코드 푸시 |
| 4 | 동작 확인 — workflow_dispatch로 수동 테스트 | GitHub Actions 탭 → "Service Status Monitor" → Run workflow → Slack 알림 수신 확인 |
