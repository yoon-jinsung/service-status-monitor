# 서비스 상태 모니터링

[English](README.md) · [日本語](README.ja.md) · **[한국어](README.ko.md)**

팀이 의존하는 외부 SaaS 서비스(GitHub, Notion, AWS, Slack)의 장애 및 상태 변화를 **자동으로 감지**하여 **Slack 채널에 실시간 알림**을 전달하는 모니터링 서비스입니다.

## 핵심 가치

- **빠른 장애 인지** — 외부 서비스 장애를 5분 내 감지
- **제로 비용** — GitHub Actions 무료 범위 내 운영 ($0/월)
- **인프라 불필요** — AWS/서버 없이 GitHub 리포지토리만으로 운영
- **코드로 관리** — 모니터링 설정, 로직, 이력 모두 Git으로 버전 관리
- **정확한 주기** — cron-job.org로 정확히 5분마다 실행

## 아키텍처

```
cron-job.org (5분마다 workflow_dispatch 트리거)
  → GitHub Actions
      ├─ config/services.json 로드 (모니터링 대상)
      ├─ 각 서비스 상태 API 병렬 호출
      ├─ state/status.json과 비교하여 변화 감지
      ├─ 변화 시 → Slack Webhook 알림 전송
      ├─ logs/incidents.json에 인시던트 이력 기록
      └─ state/status.json 업데이트 후 Git 커밋 & 푸시
```

## 모니터링 대상 서비스

| 서비스              | 상태 페이지           | 타입                 |
| ------------------- | --------------------- | -------------------- |
| GitHub              | githubstatus.com      | Atlassian Statuspage |
| Notion              | notion-status.com     | Atlassian Statuspage |
| AWS                 | health.aws.amazon.com | AWS Health API       |
| API Gateway (Seoul) | status.aws.amazon.com | AWS RSS              |
| API Gateway (Tokyo) | status.aws.amazon.com | AWS RSS              |
| Slack               | slack-status.com      | 독자 API             |

## 프로젝트 구조

```
.github/workflows/
  status-monitor.yml       # workflow_dispatch (cron-job.org에서 트리거)
  keepalive.yml            # 60일 비활성화 방지

tools/status-monitor/
  check.ts                 # 메인 실행 스크립트
  test-notification.ts     # 테스트 알림 전송 스크립트
  src/
    types.ts               # 공통 타입 정의
    config.ts              # 설정 로더
    poller.ts              # 상태 API 폴링
    parsers/
      statuspage.ts        # Atlassian Statuspage 파서
      slack.ts             # Slack 독자 API 파서
      aws.ts               # AWS Health API 파서
      aws-rss.ts           # AWS RSS 피드 파서
    detector.ts            # 상태 변화 감지
    notifier.ts            # Slack Webhook 알림
    state.ts               # state/status.json 읽기/쓰기
    logger.ts              # 인시던트 이력 기록

config/services.json       # 모니터링 대상 설정
state/status.json          # 마지막 상태 스냅샷 (Git 커밋 관리)
logs/incidents.json        # 인시던트 이력 (append-only)
```

## 설정 방법

### 1. Slack Incoming Webhook 생성

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Features → **Incoming Webhooks** → On
3. **Add New Webhook to Workspace** → `#ce-service-status-monitor` 채널 선택
4. 생성된 Webhook URL 복사

### 2. GitHub Secrets 등록

리포지토리 **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name                | Value                        |
| ------------------- | ---------------------------- |
| `SLACK_WEBHOOK_URL` | Slack에서 복사한 Webhook URL |

### 3. cron-job.org 설정 (정확한 5분 주기)

1. [cron-job.org](https://console.cron-job.org/) 계정 생성 및 로그인
2. **Create cronjob** 클릭
3. 설정:
   - **Title**: `Service Status Monitor`
   - **URL**: `https://api.github.com/repos/yoon-jinsung/service-status-monitor/actions/workflows/status-monitor.yml/dispatches`
   - **Schedule**: Every 5 minutes
   - **Request Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer <GITHUB_PAT>`
     - `Content-Type`: `application/json`
   - **Request Body**: `{"ref":"main"}`

4. GitHub PAT 생성:
   - GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
   - Repository: `service-status-monitor`만 선택
   - Permissions: **Actions** → Read and Write

### 4. 동작 확인

GitHub Actions 탭 → **Service Status Monitor** → **Run workflow** 버튼으로 수동 실행하여 정상 동작 확인

## Slack 알림 예시

### 장애 발생

> :red_circle: **Notion - Major Incident**
>
> Status: Major System Outage
> Detected At: Mar 26, 2026, 15:30:00 KST
> Previous: :large_green_circle: Operational → Current: :red_circle: Major

### 복구 완료

> :large_green_circle: **Notion - Recovered**
>
> Status: All Systems Operational
> Recovered At: Mar 26, 2026, 16:10:00 KST
> Previous: :red_circle: Major

### 상태별 알림

| 상태              | 아이콘                | 멘션       |
| ----------------- | --------------------- | ---------- |
| 복구 (none)       | :large_green_circle:  | 없음       |
| 경미 (minor)      | :large_yellow_circle: | 없음       |
| 심각 (major)      | :red_circle:          | `@here`    |
| 치명적 (critical) | :rotating_light:      | `@channel` |

## 서비스 추가 방법

`config/services.json`의 `services` 배열에 항목을 추가합니다:

```json
{
  "name": "서비스명",
  "type": "statuspage",
  "baseUrl": "https://status.example.com",
  "enabled": true
}
```

AWS 개별 서비스의 경우 `type: "aws_rss"`와 RSS URL을 `statusUrl`에 지정합니다.

## 에러 핸들링

| 시나리오            | 처리                                           |
| ------------------- | ---------------------------------------------- |
| API 타임아웃 (10초) | 해당 서비스 건너뛰기, `consecutiveFailures` +1 |
| HTTP 4xx/5xx        | 동일하게 `consecutiveFailures` +1              |
| 3회 연속 실패       | Slack에 "모니터링 실패" 알림 전송              |
| JSON 파싱 실패      | 해당 서비스 건너뛰기                           |

## 비용

| 항목                          | 비용                               |
| ----------------------------- | ---------------------------------- |
| GitHub Actions (public repo)  | 무료 (무제한)                      |
| GitHub Actions (private repo) | 무료 (월 2,000분 중 약 720분 사용) |
| Slack Incoming Webhook        | 무료                               |
| **합계**                      | **$0/월**                          |

## 로컬 실행

```bash
cd tools/status-monitor
npm install
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... npx tsx check.ts
```
